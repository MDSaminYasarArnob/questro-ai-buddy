import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';

const ImageSolver = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "Coming Soon",
        description: "Please add your Gemini API key in Settings to solve questions",
      });
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

      <Card className="p-8 bg-background-card border-border shadow-soft">
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
    </div>
  );
};

export default ImageSolver;
