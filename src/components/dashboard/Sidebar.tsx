import { useState } from 'react';
import { MessageSquare, FileText, Image, History, LogOut, Sparkles, PanelLeft, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: 'chat' | 'pdf' | 'image' | 'history') => void;
}

const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate('/auth');
    }
  };

  const menuItems = [
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'pdf', icon: FileText, label: 'PDF to MCQ' },
    { id: 'image', icon: Image, label: 'Image Solver' },
    { id: 'history', icon: History, label: 'History' },
  ];

  return (
    <div className="relative flex h-full">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-4 z-20 h-9 w-9 rounded-xl glass-card border border-border/50 hover:border-primary/50 transition-all duration-300",
          isCollapsed ? "left-3" : "left-[224px]"
        )}
      >
        {isCollapsed ? (
          <PanelLeft className="w-4 h-4 text-primary" />
        ) : (
          <PanelLeftClose className="w-4 h-4 text-primary" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div 
        className={cn(
          "glass-card border-r border-border/50 flex flex-col h-full transition-all duration-300 ease-in-out relative overflow-hidden",
          isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-64 opacity-100"
        )}
      >
        {/* Decorative gradient orb */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-glow pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent/20 rounded-full blur-3xl animate-glow pointer-events-none" style={{ animationDelay: '2s' }} />

        {/* Logo */}
        <div className="p-6 border-b border-border/50 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center animate-pulse-glow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold neon-text whitespace-nowrap">
              Questro
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 relative z-10">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 whitespace-nowrap group",
                activeView === item.id 
                  ? "neon-button text-white shadow-glow" 
                  : "hover:bg-surface/80 text-muted-foreground hover:text-foreground border border-transparent hover:border-primary/30"
              )}
              onClick={() => onViewChange(item.id as any)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-all duration-300",
                activeView === item.id ? "text-white" : "text-primary group-hover:text-primary"
              )} />
              <span>{item.label}</span>
              {activeView === item.id && (
                <div className="ml-auto w-2 h-2 rounded-full bg-accent animate-pulse" />
              )}
            </button>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-border/50 relative z-10">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 whitespace-nowrap border border-transparent hover:border-destructive/30"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
