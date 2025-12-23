import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Copy, GitBranch, Brain, Workflow, Share2, Sparkles } from 'lucide-react';
import mermaid from 'mermaid';

type DiagramType = 'flowchart' | 'mindmap' | 'diagram' | 'conceptmap';

interface DiagramResult {
  type: DiagramType;
  content: string;
  topic: string;
}

const DiagramGenerator = () => {
  const [topic, setTopic] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('flowchart');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagramResult | null>(null);
  const [renderedSvg, setRenderedSvg] = useState<string>('');
  const { toast } = useToast();
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#a855f7',
        primaryTextColor: '#fff',
        primaryBorderColor: '#c084fc',
        lineColor: '#c084fc',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#312e81',
        background: '#0a0a0f',
        mainBkg: '#1e1b4b',
        nodeBorder: '#c084fc',
        clusterBkg: '#1e1b4b',
        titleColor: '#fff',
        edgeLabelBackground: '#1e1b4b',
      },
    });
  }, []);

  useEffect(() => {
    const renderMermaid = async () => {
      if (result && (result.type === 'flowchart' || result.type === 'mindmap') && mermaidRef.current) {
        try {
          mermaidRef.current.innerHTML = '';
          const { svg } = await mermaid.render('diagram-' + Date.now(), result.content);
          setRenderedSvg(svg);
          mermaidRef.current.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid render error:', error);
          setRenderedSvg('');
        }
      }
    };
    renderMermaid();
  }, [result]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic to generate a diagram",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setRenderedSvg('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-diagram', {
        body: { topic: topic.trim(), type: diagramType },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setResult({
        type: diagramType,
        content: data.diagram,
        topic: topic.trim(),
      });

      toast({
        title: "Diagram generated!",
        description: `Your ${diagramType} has been created successfully.`,
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate diagram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result.content);
      toast({
        title: "Copied!",
        description: "Diagram code copied to clipboard",
      });
    }
  };

  const handleDownload = () => {
    if (renderedSvg && mermaidRef.current) {
      const svgElement = mermaidRef.current.querySelector('svg');
      if (svgElement) {
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result?.topic.replace(/\s+/g, '-')}-${result?.type}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else if (result) {
      const blob = new Blob([result.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.topic.replace(/\s+/g, '-')}-${result.type}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const diagramTypes = [
    { value: 'flowchart', label: 'Flowchart', icon: Workflow, description: 'Step-by-step process flow' },
    { value: 'mindmap', label: 'Mind Map', icon: Brain, description: 'Hierarchical idea mapping' },
    { value: 'diagram', label: 'Diagram Labels', icon: GitBranch, description: 'Numbered labels for diagrams' },
    { value: 'conceptmap', label: 'Concept Map', icon: Share2, description: 'Relationship-based mapping' },
  ];

  return (
    <div className="h-full p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse-glow">
              <Workflow className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold neon-text">Diagram Generator</h1>
          </div>
          <p className="text-muted-foreground">Create educational diagrams, flowcharts, and mind maps</p>
        </div>

        {/* Input Card */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Diagram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Topic Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Topic</label>
              <Input
                placeholder="e.g., Photosynthesis, Water Cycle, Cell Division..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="bg-surface/50 border-border/50 focus:border-primary"
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerate()}
              />
            </div>

            {/* Diagram Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Diagram Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {diagramTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setDiagramType(type.value as DiagramType)}
                    className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                      diagramType === type.value
                        ? 'border-primary bg-primary/10 shadow-glow'
                        : 'border-border/50 bg-surface/30 hover:border-primary/50'
                    }`}
                  >
                    <type.icon className={`w-5 h-5 mb-2 ${diagramType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className={`text-sm font-medium ${diagramType === type.value ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              className="w-full neon-button h-12"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Diagram
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <Card className="glass-card border-border/50 animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                {result.type === 'flowchart' && 'Flowchart'}
                {result.type === 'mindmap' && 'Mind Map'}
                {result.type === 'diagram' && 'Diagram Labels'}
                {result.type === 'conceptmap' && 'Concept Map'}
                : {result.topic}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="border-border/50">
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="border-border/50">
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mermaid Render */}
              {(result.type === 'flowchart' || result.type === 'mindmap') && (
                <div 
                  ref={mermaidRef} 
                  className="bg-surface/30 rounded-xl p-4 overflow-x-auto min-h-[200px] flex items-center justify-center"
                />
              )}

              {/* Text-based diagrams */}
              {(result.type === 'diagram' || result.type === 'conceptmap') && (
                <div className="bg-surface/30 rounded-xl p-6">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                    {result.content}
                  </pre>
                </div>
              )}

              {/* Raw Code Toggle */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  View raw code
                </summary>
                <pre className="mt-2 p-4 bg-surface/50 rounded-lg text-xs overflow-x-auto text-muted-foreground">
                  {result.content}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DiagramGenerator;
