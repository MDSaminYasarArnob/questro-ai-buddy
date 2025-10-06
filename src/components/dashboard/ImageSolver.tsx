import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

      if (error) throw error;

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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Image Question Solver</h2>
        <p className="text-muted-foreground">
          Upload an image of your question paper and get solutions in any language
        </p>
      </div>

      <Card className="p-8 bg-card border-border shadow-soft mb-6">
        <div className="flex flex-col items-center justify-center py-12">
          {!imagePreview ? (
            <>
              <ImageIcon className="w-16 h-16 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Upload Question Image</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Take a photo or upload an image of your questions. AI will solve them step-by-step.
              </p>
              
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-primary hover:opacity-90 transition-opacity font-medium text-primary-foreground">
                  <Upload className="w-4 h-4" />
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
            <div className="w-full space-y-4">
              <div className="relative w-full max-w-2xl mx-auto">
                <img 
                  src={imagePreview} 
                  alt="Uploaded question" 
                  className="w-full h-auto rounded-lg border border-border"
                />
              </div>
              
              <div className="flex gap-3 justify-center">
                <label htmlFor="image-upload-change" className="cursor-pointer">
                  <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium">
                    <Upload className="w-4 h-4" />
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
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-primary hover:opacity-90 transition-opacity font-medium text-primary-foreground disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Solving...
                    </>
                  ) : (
                    'Solve Now'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {solution && (
        <Card className="p-6 bg-card border-border shadow-soft">
          <h3 className="text-xl font-semibold mb-4 text-foreground">Solution:</h3>
          <div className="text-foreground max-w-none whitespace-pre-wrap leading-relaxed">
            {solution}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImageSolver;
