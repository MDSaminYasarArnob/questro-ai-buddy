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
  MessageCircle
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
    <div className="relative flex">
      {/* Toggle Button - Always visible on the left side of this component */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-3 z-10 h-8 w-8 bg-surface border border-border shadow-sm hover:bg-muted transition-all duration-300",
          isCollapsed ? "right-2" : "right-[248px]"
        )}
      >
        {isCollapsed ? (
          <PanelRight className="w-4 h-4" />
        ) : (
          <PanelRightClose className="w-4 h-4" />
        )}
      </Button>

      {/* Sidebar - on right side */}
      <div 
        className={cn(
          "h-full bg-surface border-l border-border flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-64 opacity-100"
        )}
      >
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center gap-2 min-w-[256px]">
          <Button
            onClick={onNewChat}
            className="flex-1 bg-gradient-primary hover:opacity-90"
            size="sm"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Chat list */}
        <ScrollArea className="flex-1 min-w-[256px]">
          {chats.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
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
