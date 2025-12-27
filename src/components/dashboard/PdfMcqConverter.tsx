import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, X, Sparkles, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import McqQuiz, { MCQQuestion } from './McqQuiz';

const PdfMcqConverter = () => {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [mcqCount, setMcqCount] = useState<number>(10);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
    setQuestions([]);
    
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
        body: { pdfBase64, mcqCount }
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

      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
      } else {
        throw new Error('Invalid response format');
      }

      await supabase.from('chat_history').insert({
        user_id: user!.id,
        title: `MCQ Quiz - ${pdfFile.name}`,
        type: 'pdf_mcq',
        messages: [{ questions: data.questions }]
      });

      toast({
        title: "Success",
        description: "MCQ Quiz generated! Answer the questions below.",
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
    setQuestions([]);
  };

  const handleRetry = () => {
    setQuestions([]);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-4 sm:mb-6 md:mb-8 animate-fade-in">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-primary flex items-center justify-center">
            <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold neon-text">PDF to MCQ Quiz</h2>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Transform your study materials into interactive quizzes
            </p>
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        <Card className="glass-card glow-border rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6">
          {!pdfFile ? (
            <div className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-12">
              <div className="w-16 h-16 sm:w-20 md:w-24 sm:h-20 md:h-24 rounded-2xl md:rounded-3xl bg-gradient-card border border-primary/30 flex items-center justify-center mb-4 sm:mb-6">
                <FileText className="w-8 h-8 sm:w-10 md:w-12 sm:h-10 md:h-12 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 text-foreground text-center">Upload Your PDF</h3>
              <p className="text-muted-foreground text-center mb-4 sm:mb-6 md:mb-8 max-w-md text-sm sm:text-base px-4">
                Upload your textbook or study material. AI will generate MCQs for you to practice.
              </p>
              
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="neon-button inline-flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-white text-sm sm:text-base">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
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
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 glass-card rounded-xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-card flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{pdfFile.name}</p>
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
                  className="hover:bg-destructive/10 hover:text-destructive rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-4 glass-card rounded-xl p-4 border border-border/50">
                <label htmlFor="mcq-count" className="text-sm font-medium whitespace-nowrap text-foreground">
                  Number of MCQs:
                </label>
                <input
                  id="mcq-count"
                  type="number"
                  min={1}
                  max={50}
                  value={mcqCount}
                  onChange={(e) => {
                    const val = Math.min(50, Math.max(1, parseInt(e.target.value) || 1));
                    setMcqCount(val);
                  }}
                  className="w-20 h-10 rounded-lg glass-card border border-border/50 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                  disabled={loading}
                />
                <span className="text-xs text-muted-foreground">(1-50)</span>
              </div>
              
              <Button
                onClick={handleConvert}
                disabled={loading}
                className="w-full neon-button rounded-xl h-14 text-lg font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating Quiz...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate {mcqCount} MCQs
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between glass-card rounded-xl p-4 border border-border/50">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Quiz: {pdfFile?.name}</h3>
              <p className="text-sm text-muted-foreground">Answer all {questions.length} questions and submit to see your results</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearPdf}
              className="glass-card border-border/50 hover:border-primary/50 rounded-lg"
            >
              <X className="w-4 h-4 mr-2" />
              New PDF
            </Button>
          </div>
          
          <McqQuiz questions={questions} onRetry={handleRetry} />
        </div>
      )}
    </div>
  );
};

export default PdfMcqConverter;