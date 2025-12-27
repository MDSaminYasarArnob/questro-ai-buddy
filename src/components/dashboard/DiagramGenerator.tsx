import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, Copy, Workflow, Share2, Sparkles } from 'lucide-react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';

type DiagramType = 'flowchart' | 'conceptmap';

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
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: {
        // Modern gradient-inspired color palette
        primaryColor: '#8b5cf6',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#a78bfa',
        lineColor: '#c4b5fd',
        secondaryColor: '#6366f1',
        tertiaryColor: '#a855f7',
        background: 'transparent',
        mainBkg: '#8b5cf6',
        nodeBorder: '#a78bfa',
        clusterBkg: 'rgba(139, 92, 246, 0.1)',
        titleColor: '#ffffff',
        edgeLabelBackground: 'rgba(30, 27, 75, 0.9)',
        nodeTextColor: '#ffffff',
        textColor: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        // Flowchart specific
        nodeBkg: '#8b5cf6',
        // Mind map specific
        mindmapTextColor: '#ffffff',
      },
      flowchart: {
        nodeSpacing: 60,
        rankSpacing: 70,
        curve: 'basis',
        htmlLabels: true,
        useMaxWidth: true,
        padding: 20,
        diagramPadding: 8,
      },
      mindmap: {
        padding: 20,
        useMaxWidth: true,
      },
    });
  }, []);

  useEffect(() => {
    const renderMermaid = async () => {
      if (result && result.type === 'flowchart' && mermaidRef.current) {
        try {
          mermaidRef.current.innerHTML = '';
          const { svg } = await mermaid.render('diagram-' + Date.now(), result.content);
          
          // Add premium styling to SVG
          let styledSvg = svg.replace(
            '<svg',
            `<svg style="font-family: 'Inter', system-ui, sans-serif; font-weight: 500;"`
          );
          
          // Inject comprehensive modern styles
          const modernStyles = `
            /* Node styling - modern glassmorphic look */
            .node rect, .node circle, .node ellipse, .node polygon {
              fill: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%) !important;
              fill: #8b5cf6 !important;
              stroke: #a78bfa !important;
              stroke-width: 2px !important;
              rx: 12px !important;
              ry: 12px !important;
              filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.3)) !important;
            }
            
            /* Diamond/decision nodes */
            .node polygon {
              fill: #6366f1 !important;
              stroke: #818cf8 !important;
            }
            
            /* Text styling - crisp and readable */
            .nodeLabel, .label, text, .edgeLabel, .node text {
              fill: #ffffff !important;
              color: #ffffff !important;
              font-weight: 600 !important;
              font-size: 13px !important;
              letter-spacing: 0.01em !important;
            }
            
            span.nodeLabel, foreignObject div, foreignObject span {
              color: #ffffff !important;
              font-weight: 600 !important;
              font-size: 13px !important;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
            }
            
            /* Edge labels */
            .edgeLabel rect {
              fill: rgba(30, 27, 75, 0.95) !important;
              stroke: #6366f1 !important;
              stroke-width: 1px !important;
              rx: 8px !important;
              ry: 8px !important;
            }
            
            .edgeLabel text, .edgeLabel span {
              fill: #e2e8f0 !important;
              color: #e2e8f0 !important;
              font-size: 11px !important;
              font-weight: 500 !important;
            }
            
            /* Flow lines - smooth gradient feel */
            .flowchart-link, path.path {
              stroke: #c4b5fd !important;
              stroke-width: 2px !important;
            }
            
            /* Arrow markers */
            .marker, marker path {
              fill: #c4b5fd !important;
              stroke: #c4b5fd !important;
            }
            
            /* Mind map specific styling */
            .mindmap-node rect, .mindmap-node circle {
              fill: #8b5cf6 !important;
              stroke: #a78bfa !important;
              stroke-width: 2px !important;
              rx: 16px !important;
              ry: 16px !important;
              filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.25)) !important;
            }
            
            .mindmap-node .nodeLabel {
              color: #ffffff !important;
              font-weight: 600 !important;
            }
            
            /* Mind map root node - make it stand out */
            .mindmap-node:first-of-type rect {
              fill: #7c3aed !important;
              stroke: #8b5cf6 !important;
              stroke-width: 3px !important;
              filter: drop-shadow(0 6px 20px rgba(124, 58, 237, 0.4)) !important;
            }
            
            /* Mind map branches */
            .mindmap-edge, .mindmap path {
              stroke: #a78bfa !important;
              stroke-width: 2px !important;
            }
            
            /* Clusters/subgraphs */
            .cluster rect {
              fill: rgba(139, 92, 246, 0.08) !important;
              stroke: rgba(167, 139, 250, 0.4) !important;
              stroke-width: 2px !important;
              rx: 16px !important;
              ry: 16px !important;
            }
            
            .cluster text {
              fill: #c4b5fd !important;
              font-weight: 600 !important;
            }
          `;
          
          styledSvg = styledSvg.replace(/<style[^>]*>/, `<style>${modernStyles}`);
          
          // Sanitize SVG to prevent XSS attacks
          const sanitizedSvg = DOMPurify.sanitize(styledSvg, { 
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ['use', 'foreignObject', 'style'],
            ADD_ATTR: ['xlink:href', 'style']
          });
          
          // Validate that output is actually SVG
          if (!sanitizedSvg.trim().startsWith('<svg')) {
            throw new Error('Invalid SVG output');
          }
          
          setRenderedSvg(sanitizedSvg);
          mermaidRef.current.innerHTML = sanitizedSvg;
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
    { value: 'conceptmap', label: 'Concept Map', icon: Share2, description: 'Relationship-based mapping' },
  ];

  return (
    <div className="h-full p-3 sm:p-4 md:p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse-glow">
              <Workflow className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold neon-text">Diagram Generator</h1>
          </div>
          <p className="text-muted-foreground text-sm hidden sm:block">Create educational diagrams and flowcharts</p>
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
              <div className="grid grid-cols-2 gap-3">
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
              {result.type === 'flowchart' && (
                <div 
                  ref={mermaidRef} 
                  className="mermaid-diagram bg-gradient-to-br from-surface/40 via-surface/20 to-primary/5 rounded-2xl p-8 overflow-x-auto min-h-[300px] flex items-center justify-center border border-border/30 backdrop-blur-sm shadow-xl [&_svg]:max-w-full [&_text]:fill-white [&_.nodeLabel]:!text-white [&_span]:!text-white [&_foreignObject_div]:!text-white [&_.label]:!text-white"
                />
              )}


              {result.type === 'conceptmap' && (
                <div className="bg-surface/30 rounded-xl p-6">
                  <div className="space-y-4">
                    {result.content.split('\n').filter(line => line.trim()).map((line, index) => {
                      // Parse concept map format: Concept1 (relation)→ Concept2
                      const parts = line.split('→');
                      if (parts.length >= 2) {
                        const from = parts[0].trim();
                        const to = parts.slice(1).join('→').trim();
                        const relationMatch = from.match(/(.+?)\s*\((.+?)\)\s*$/);
                        
                        return (
                          <div key={index} className="flex items-center gap-3 flex-wrap">
                            <div className="px-4 py-2 bg-primary/20 border border-primary/40 rounded-xl text-foreground font-medium">
                              {relationMatch ? relationMatch[1].trim() : from}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-0.5 bg-accent"></div>
                              <span className="text-xs px-2 py-1 bg-accent/20 rounded-full text-accent font-medium">
                                {relationMatch ? relationMatch[2] : 'relates to'}
                              </span>
                              <div className="w-8 h-0.5 bg-accent"></div>
                              <span className="text-accent">→</span>
                            </div>
                            <div className="px-4 py-2 bg-accent/20 border border-accent/40 rounded-xl text-foreground font-medium">
                              {to}
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={index} className="px-4 py-2 bg-surface/50 rounded-lg text-foreground">
                          {line}
                        </div>
                      );
                    })}
                  </div>
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
