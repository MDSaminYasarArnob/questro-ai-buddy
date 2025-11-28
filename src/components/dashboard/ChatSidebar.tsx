import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquarePlus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  MessageCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
  messages: any[];
}

interface ChatSidebarProps {
  currentChatId: string | null;
  onSelectChat: (chat: ChatHistory | null) => void;
  onNewChat: () => void;
  refreshTrigger: number;
}

const ChatSidebar = ({ currentChatId, onSelectChat, onNewChat, refreshTrigger }: ChatSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'chat')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats((data || []) as ChatHistory[]);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [user, refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      setChats(prev => prev.filter(c => c.id !== chatId));
      
      if (currentChatId === chatId) {
        onNewChat();
      }

      toast({
        title: "Chat deleted",
        description: "The conversation has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      className={cn(
        "h-full bg-surface border-r border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <Button
            onClick={onNewChat}
            className="flex-1 mr-2 bg-gradient-primary hover:opacity-90"
            size="sm"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* New chat button when collapsed */}
      {isCollapsed && (
        <div className="p-2 border-b border-border">
          <Button
            onClick={onNewChat}
            variant="ghost"
            size="icon"
            className="w-full"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Chat list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : chats.length === 0 ? (
          !isCollapsed && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          )
        ) : (
          <div className="p-2 space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                  currentChatId === chat.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/50 text-foreground"
                )}
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(chat.created_at)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, chat.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
