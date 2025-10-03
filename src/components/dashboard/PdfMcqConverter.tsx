import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2 } from 'lucide-react';

const PdfMcqConverter = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "Coming Soon",
        description: "Please add your Gemini API key in Settings to convert PDFs",
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">PDF to MCQ Converter</h2>
        <p className="text-muted-foreground">
          Upload your textbook PDF and get important MCQs generated automatically
        </p>
      </div>

      <Card className="p-8 bg-background-card border-border shadow-soft">
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="w-16 h-16 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Upload Your PDF</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Support for textbooks up to 50 pages. Get MCQs generated in any language you prefer.
          </p>
          
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-primary hover:opacity-90 transition-opacity font-medium">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Choose PDF File
                </>
              )}
            </div>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={loading}
            />
          </label>
        </div>
      </Card>
    </div>
  );
};

export default PdfMcqConverter;
