import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const PdfMcqConverter = () => {
  const [loading, setLoading] = useState(false);
  const [mcqs, setMcqs] = useState('');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setMcqs('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('convert-pdf-mcq', {
          body: { pdfBase64: base64, apiKey }
        });

        if (error) throw error;

        setMcqs(data.mcqs);

        await supabase.from('chat_history').insert({
          user_id: user!.id,
          title: `PDF MCQs - ${file.name}`,
          type: 'pdf_mcq',
          messages: [{ mcqs: data.mcqs }]
        });

        toast({
          title: "Success",
          description: "MCQs generated successfully!",
        });
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to convert PDF",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

      <Card className="p-8 bg-background-card border-border shadow-soft mb-6">
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

      {mcqs && (
        <Card className="p-6 bg-background-card border-border shadow-soft">
          <h3 className="text-xl font-semibold mb-4">Generated MCQs:</h3>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {mcqs}
            </ReactMarkdown>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PdfMcqConverter;
