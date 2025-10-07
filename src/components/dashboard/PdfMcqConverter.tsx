import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, X } from 'lucide-react';
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
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
      e.target.value = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    setPdfFile(file);
    setMcqs('');
    
    // Read file as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result?.toString();
      if (base64String) {
        const base64 = base64String.split(',')[1];
        setPdfBase64(base64);
      }
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  };

  const handleConvert = async () => {
    if (!pdfBase64 || !pdfFile) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('convert-pdf-mcq', {
        body: { pdfBase64 }
      });

      if (error) throw error;

      setMcqs(data.mcqs);

      await supabase.from('chat_history').insert({
        user_id: user!.id,
        title: `PDF MCQs - ${pdfFile.name}`,
        type: 'pdf_mcq',
        messages: [{ mcqs: data.mcqs }]
      });

      toast({
        title: "Success",
        description: "MCQs generated successfully!",
      });
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

  const handleClearPdf = () => {
    setPdfFile(null);
    setPdfBase64(null);
    setMcqs('');
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
        {!pdfFile ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-primary mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upload Your PDF</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Support for textbooks up to 50 pages. Get MCQs generated in any language you prefer.
            </p>
            
            <label htmlFor="pdf-upload" className="cursor-pointer">
              <div className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-primary hover:opacity-90 transition-opacity font-medium">
                <Upload className="w-4 h-4" />
                Choose PDF File
              </div>
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-medium">{pdfFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearPdf}
                disabled={loading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <Button
              onClick={handleConvert}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Converting...
                </>
              ) : (
                'Convert to MCQs'
              )}
            </Button>
          </div>
        )}
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
