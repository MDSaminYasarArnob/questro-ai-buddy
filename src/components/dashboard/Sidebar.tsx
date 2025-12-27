import { useState, useEffect } from 'react';
import { MessageSquare, FileText, Image, History, LogOut, Sparkles, PanelLeft, PanelLeftClose, BookOpen, Settings, Workflow, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: 'chat' | 'pdf' | 'image' | 'summary' | 'diagram' | 'history' | 'settings') => void;
}

const Sidebar = ({ activeView, onViewChange }: SidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [activeView]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    { id: 'summary', icon: BookOpen, label: 'Smart Summaries' },
    { id: 'diagram', icon: Workflow, label: 'Diagrams' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const handleViewChange = (view: 'chat' | 'pdf' | 'image' | 'summary' | 'diagram' | 'history' | 'settings') => {
    onViewChange(view);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 glass-card border-b border-border/50 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg neon-text">Questro</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="h-9 w-9 rounded-lg"
        >
          {isMobileOpen ? (
            <X className="w-5 h-5 text-primary" />
          ) : (
            <Menu className="w-5 h-5 text-primary" />
          )}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "md:hidden fixed top-14 left-0 right-0 bottom-0 glass-card z-40 transition-transform duration-300 ease-out overflow-y-auto",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors duration-200 group",
                activeView === item.id 
                  ? "neon-button text-white" 
                  : "hover:bg-surface/80 text-muted-foreground hover:text-foreground border border-transparent hover:border-primary/30"
              )}
              onClick={() => handleViewChange(item.id as any)}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors duration-200",
                activeView === item.id ? "text-white" : "text-primary group-hover:text-primary"
              )} />
              <span>{item.label}</span>
              {activeView === item.id && (
                <div className="ml-auto w-2 h-2 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 border border-transparent hover:border-destructive/30"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex relative h-full">
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute top-4 z-20 h-9 w-9 rounded-xl glass-card border border-border/50 hover:border-primary/50 transition-colors duration-200",
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
            "glass-card border-r border-border/50 flex flex-col h-full transition-all duration-200 ease-out overflow-hidden",
            isCollapsed ? "w-0 opacity-0" : "w-64 opacity-100"
          )}
        >
          {/* Logo */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold neon-text whitespace-nowrap">
                Questro
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors duration-200 whitespace-nowrap group",
                  activeView === item.id 
                    ? "neon-button text-white" 
                    : "hover:bg-surface/80 text-muted-foreground hover:text-foreground border border-transparent hover:border-primary/30"
                )}
                onClick={() => onViewChange(item.id as any)}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-colors duration-200",
                  activeView === item.id ? "text-white" : "text-primary group-hover:text-primary"
                )} />
                <span>{item.label}</span>
                {activeView === item.id && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </nav>

          {/* Sign Out */}
          <div className="p-4 border-t border-border/50">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 whitespace-nowrap border border-transparent hover:border-destructive/30"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;