import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Loader2, Sparkles, Camera, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const ImageSolver = () => {
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setSolution('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSolve = async () => {
    if (!imageFile || !imagePreview) return;

    setLoading(true);
    setSolution('');

    try {
      const base64 = imagePreview.split(',')[1];
      
      const { data, error } = await supabase.functions.invoke('solve-image', {
        body: { imageBase64: base64 }
      });

      if (error) {
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (error.message?.includes('402')) {
          throw new Error('AI service quota exceeded. Please add credits to continue.');
        }
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSolution(data.solution);

      await supabase.from('chat_history').insert({
        user_id: user!.id,
        title: `Image solution - ${imageFile.name}`,
        type: 'image_solve',
        messages: [{ solution: data.solution }]
      });

      toast({
        title: "Success",
        description: "Solution generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to solve image",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      {/* Decorative orbs */}
      <div className="absolute top-20 left-10 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-glow pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-glow pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="mb-8 animate-fade-in relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse-glow">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold neon-text">Image Question Solver</h2>
            <p className="text-sm text-muted-foreground">
              Snap, upload, and get step-by-step solutions instantly
            </p>
          </div>
        </div>
      </div>

      <Card className="glass-card glow-border rounded-2xl p-8 mb-6 animate-slide-up relative z-10">
        <div className="flex flex-col items-center justify-center py-8">
          {!imagePreview ? (
            <>
              <div className="w-24 h-24 rounded-3xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center mb-6 animate-float">
                <ImageIcon className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-foreground">Upload Question Image</h3>
              <p className="text-muted-foreground text-center mb-8 max-w-md">
                Take a photo or upload an image of your questions. AI will solve them step-by-step.
              </p>
              
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="neon-button inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white">
                  <Upload className="w-5 h-5" />
                  Choose Image
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </>
          ) : (
            <div className="w-full space-y-6">
              <div className="relative w-full max-w-2xl mx-auto">
                <div className="glass-card rounded-2xl p-2 border border-border/50">
                  <img 
                    src={imagePreview} 
                    alt="Uploaded question" 
                    className="w-full h-auto rounded-xl"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <label htmlFor="image-upload-change" className="cursor-pointer">
                  <div className="glass-card inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-foreground border border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300">
                    <Upload className="w-4 h-4 text-primary" />
                    Change Image
                  </div>
                  <input
                    id="image-upload-change"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                
                <button
                  onClick={handleSolve}
                  disabled={loading}
                  className="neon-button inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Solving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Solve Now
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {solution && (
        <Card className="glass-card glow-border rounded-2xl p-6 animate-slide-up relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Solution</h3>
          </div>
          <div className="prose prose-invert max-w-none prose-p:my-3 prose-headings:text-foreground prose-code:text-accent prose-strong:text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {solution}
            </ReactMarkdown>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImageSolver;
