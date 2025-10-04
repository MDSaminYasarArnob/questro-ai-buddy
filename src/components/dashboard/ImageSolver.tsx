import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ImageSolver = () => {
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadApiKey();
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setApiKey(data?.api_key || null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Gemini API key in Settings first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSolution('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('solve-image', {
          body: { imageBase64: base64, apiKey }
        });

        if (error) throw error;

        setSolution(data.solution);

        await supabase.from('chat_history').insert({
          user_id: user!.id,
          title: `Image solution - ${file.name}`,
          type: 'image_solve',
          messages: [{ solution: data.solution }]
        });

        toast({
          title: "Success",
          description: "Solution generated successfully!",
        });
      };
      reader.readAsDataURL(file);
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

      <Card className="p-8 bg-background-card border-border shadow-soft mb-6">
        <div className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="w-16 h-16 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Upload Question Image</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Take a photo or upload an image of your questions. AI will solve them step-by-step in your preferred language.
          </p>
          
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-primary hover:opacity-90 transition-opacity font-medium">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Choose Image
                </>
              )}
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
        </div>
      </Card>

      {solution && (
        <Card className="p-6 bg-background-card border-border shadow-soft">
          <h3 className="text-xl font-semibold mb-4">Solution:</h3>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">
            {solution}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ImageSolver;
