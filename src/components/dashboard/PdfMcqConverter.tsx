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
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfMcqConverter = () => {
  const [loading, setLoading] = useState(false);
  const [mcqs, setMcqs] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
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
    
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result?.toString();
          if (!base64String) return;
          
          const base64 = base64String.split(',')[1];
          setPdfBase64(base64 || null);
          
          // Generate preview of first page
          if (base64) {
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            const loadingTask = pdfjsLib.getDocument({ data: bytes });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            if (context) {
              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              await page.render(renderContext as any).promise;
              
              setPdfPreview(canvas.toDataURL());
            }
          }
        } catch (error: any) {
          console.error('PDF preview error:', error);
          toast({
            title: "Preview Error",
            description: "Could not generate preview, but you can still convert",
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('File read error:', error);
      toast({
        title: "Error",
        description: "Failed to read PDF file",
        variant: "destructive",
      });
    }
    
    e.target.value = '';
  };

  const handleConvert = async () => {
    if (!pdfBase64 || !pdfFile) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('convert-pdf-mcq', {
        body: { pdfBase64, apiKey }
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
    setPdfPreview(null);
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{pdfFile.name}</span>
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
            
            {pdfPreview && (
              <div className="border border-border rounded-lg overflow-hidden">
                <img 
                  src={pdfPreview} 
                  alt="PDF Preview" 
                  className="w-full h-auto"
                />
              </div>
            )}
            
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
