import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { LocalChatHistory } from '@/hooks/useLocalChatHistory';
import { 
  MessageSquarePlus, 
  PanelRightClose, 
  PanelRight, 
  Trash2, 
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  currentChatId: string | null;
  onSelectChat: (chat: LocalChatHistory | null) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  chats: LocalChatHistory[];
  refreshTrigger: number;
}

const ChatSidebar = ({ currentChatId, onSelectChat, onNewChat, onDeleteChat, chats }: ChatSidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { toast } = useToast();

  const handleDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    onDeleteChat(chatId);
    toast({
      title: "Chat deleted",
      description: "The conversation has been removed",
    });
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
    <div className="relative flex h-full">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-4 z-20 h-9 w-9 rounded-xl glass-card border border-border/50 hover:border-primary/50 transition-all duration-300",
          isCollapsed ? "right-3" : "right-[256px]"
        )}
      >
        {isCollapsed ? (
          <PanelRight className="w-4 h-4 text-primary" />
        ) : (
          <PanelRightClose className="w-4 h-4 text-primary" />
        )}
      </Button>

      {/* Sidebar */}
      <div 
        className={cn(
          "h-full glass-card border-l border-border/50 flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden",
          isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-72 opacity-100"
        )}
      >
        {/* Decorative gradient */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/20 rounded-full blur-3xl animate-glow pointer-events-none" />

        {/* Header */}
        <div className="p-4 border-b border-border/50 min-w-[288px] relative z-10">
          <Button
            onClick={onNewChat}
            className="w-full neon-button rounded-xl h-12 font-semibold"
          >
            <MessageSquarePlus className="w-5 h-5 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1 min-w-[288px] relative z-10">
          {chats.length === 0 ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary/20 border border-primary/30 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">No conversations yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Start chatting to see your history</p>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {chats.map((chat, index) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat)}
                  className={cn(
                    "group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 animate-fade-in",
                    currentChatId === chat.id
                      ? "glass-card border border-primary/50 shadow-glow"
                      : "hover:bg-surface/50 border border-transparent hover:border-border/50"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                    currentChatId === chat.id 
                      ? "bg-gradient-primary" 
                      : "bg-surface group-hover:bg-primary/20"
                  )}>
                    <MessageCircle className={cn(
                      "w-4 h-4 transition-colors",
                      currentChatId === chat.id ? "text-white" : "text-primary"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate transition-colors",
                      currentChatId === chat.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {chat.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70">{formatDate(chat.created_at)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 transition-all duration-300 hover:bg-destructive/10 hover:text-destructive text-muted-foreground/60 hover:text-destructive rounded-lg shrink-0"
                    onClick={(e) => handleDelete(e, chat.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatSidebar;
