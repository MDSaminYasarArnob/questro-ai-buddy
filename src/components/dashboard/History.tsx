import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, FileText, Image, Trash2, Clock, History as HistoryIcon, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HistoryItem {
  id: string;
  title: string;
  type: 'chat' | 'pdf_mcq' | 'image_solve';
  created_at: string;
}

const History = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('chat_history')
      .select('id, title, type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setLoading(false);

    if (error) {
      console.error('Error loading history:', error);
      return;
    }

    setHistory((data || []) as HistoryItem[]);
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('chat_history')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setHistory(history.filter((item) => item.id !== id));
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'chat':
        return <MessageSquare className="w-5 h-5" />;
      case 'pdf_mcq':
        return <FileText className="w-5 h-5" />;
      case 'image_solve':
        return <Image className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chat':
        return 'Chat';
      case 'pdf_mcq':
        return 'MCQ Quiz';
      case 'image_solve':
        return 'Image Solution';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto relative">
      {/* Decorative orbs */}
      <div className="absolute top-10 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-glow pointer-events-none" />
      <div className="absolute bottom-20 left-20 w-60 h-60 bg-accent/10 rounded-full blur-3xl animate-glow pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="mb-8 animate-fade-in relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse-glow">
            <HistoryIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold neon-text">History</h2>
            <p className="text-sm text-muted-foreground">
              View and manage your past conversations and queries
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <Card className="glass-card rounded-2xl p-12 text-center animate-pulse relative z-10">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      ) : history.length === 0 ? (
        <Card className="glass-card glow-border rounded-2xl p-12 text-center animate-slide-up relative z-10">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center mb-6 animate-float">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">No history yet</h3>
          <p className="text-muted-foreground">Start using Questro to see your activity here!</p>
        </Card>
      ) : (
        <div className="space-y-4 relative z-10">
          {history.map((item, index) => (
            <Card 
              key={item.id} 
              className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 group animate-fade-in hover-lift"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gradient-primary/20 flex items-center justify-center shrink-0 group-hover:bg-gradient-primary/30 transition-colors">
                    <span className="text-primary">
                      {getIcon(item.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1 truncate">{item.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                        {getTypeLabel(item.type)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-destructive/10 hover:text-destructive rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
