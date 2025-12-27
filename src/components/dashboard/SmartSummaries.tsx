import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Loader2, BookOpen, List, Network, Layers, X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface SummaryResult {
  shortSummary: string;
  keyPoints: string[];
  mindMap: string;
  chapterBreakdown: { title: string; content: string }[];
}

const SmartSummaries = () => {
  const [inputText, setInputText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a PDF smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setPdfFile(file);
    setInputText('');

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setPdfBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setInputText('');
    setPdfFile(null);
    setPdfBase64('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!inputText.trim() && !pdfBase64) {
      toast({
        title: "No content",
        description: "Please paste text or upload a PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('smart-summary', {
        body: {
          text: inputText.trim() || null,
          pdfBase64: pdfBase64 || null,
        },
      });

      if (error) {
        // Handle edge function errors (including 400 status)
        const errorMessage = error.message || '';
        if (errorMessage.includes('API key') || errorMessage.includes('api_key')) {
          toast({
            title: "API Key Required",
            description: "Please add your Gemini API key in Settings.",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('API key') || data.error.includes('api_key')) {
          toast({
            title: "API Key Required",
            description: "Please add your Gemini API key in Settings.",
            variant: "destructive",
          });
        } else if (data.error.includes('rate limit') || data.error.includes('quota')) {
          toast({
            title: "Rate Limited",
            description: "API rate limit reached. Please try again later.",
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setResult(data);
      toast({
        title: "Success",
        description: "Summary generated successfully!",
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      const errorMsg = error?.message || error?.context?.body || '';
      
      if (errorMsg.includes('API key') || errorMsg.includes('api_key')) {
        toast({
          title: "API Key Required",
          description: "Please add your Gemini API key in Settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to generate summary. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold neon-text flex items-center gap-2 sm:gap-3">
          <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          Smart Summaries
        </h2>
        <p className="text-muted-foreground mt-2 text-xs sm:text-sm md:text-base">
          Paste text or upload a PDF to get AI-powered summaries, key points, and chapter breakdowns.
        </p>
      </div>

      {!result ? (
        <div className="flex-1 flex flex-col gap-6">
          {/* Input Section */}
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Input Content
              </CardTitle>
              <CardDescription>
                Paste your text below or upload a PDF document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PDF Upload */}
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-primary/50 hover:border-primary hover:bg-primary/10"
                  disabled={isLoading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </Button>
                {pdfFile && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground truncate max-w-[200px]">
                      {pdfFile.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleClear}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Or Divider */}
              {!pdfFile && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-muted-foreground text-sm">OR</span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>

                  {/* Text Input */}
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste your long text here... (articles, notes, documents, etc.)"
                    className="min-h-[200px] resize-none bg-surface/50 border-border/50 focus:border-primary/50"
                    disabled={isLoading}
                  />
                </>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isLoading || (!inputText.trim() && !pdfBase64)}
                className="w-full neon-button"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Smart Summary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Features Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BookOpen, label: 'Short Summary', desc: 'Concise overview' },
              { icon: List, label: 'Key Points', desc: 'Important takeaways' },
              { icon: Network, label: 'Mind Map', desc: 'Visual structure' },
              { icon: Layers, label: 'Chapters', desc: 'Section breakdown' },
            ].map((feature, i) => (
              <Card key={i} className="glass-card border-border/50 p-4 text-center">
                <feature.icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold text-sm">{feature.label}</h4>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Results</h3>
            <Button variant="outline" onClick={handleClear}>
              <X className="w-4 h-4 mr-2" />
              New Summary
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 w-full max-w-lg glass-card">
              <TabsTrigger value="summary" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Summary</span>
              </TabsTrigger>
              <TabsTrigger value="keypoints" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Key Points</span>
              </TabsTrigger>
              <TabsTrigger value="mindmap" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                <span className="hidden sm:inline">Mind Map</span>
              </TabsTrigger>
              <TabsTrigger value="chapters" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Chapters</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="summary" className="m-0">
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Short Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {result.shortSummary}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="keypoints" className="m-0">
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <List className="w-5 h-5 text-primary" />
                      Key Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {result.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">{index + 1}</span>
                          </div>
                          <span className="text-foreground">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mindmap" className="m-0">
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="w-5 h-5 text-primary" />
                      Mind Map
                    </CardTitle>
                    <CardDescription>
                      Visual representation of the content structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-invert max-w-none whitespace-pre-wrap font-mono text-sm bg-surface/50 p-4 rounded-lg border border-border/50">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {result.mindMap}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chapters" className="m-0">
                <Card className="glass-card border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      Chapter-wise Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.chapterBreakdown.map((chapter, index) => (
                        <div key={index} className="border border-border/50 rounded-lg overflow-hidden">
                          <div className="bg-primary/10 px-4 py-3 border-b border-border/50">
                            <h4 className="font-semibold flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-xs">
                                {index + 1}
                              </span>
                              {chapter.title}
                            </h4>
                          </div>
                          <div className="p-4 prose prose-invert max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {chapter.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default SmartSummaries;
