import { useState } from 'react';
import { MessageSquare, FileText, Image, History, LogOut, Sparkles, PanelLeft, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

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
    <div className="relative flex">
      {/* Toggle Button - Always visible */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute top-4 z-20 transition-all duration-300 ${
          isCollapsed ? 'left-2' : 'left-[216px]'
        }`}
      >
        {isCollapsed ? (
          <PanelLeft className="w-5 h-5" />
        ) : (
          <PanelLeftClose className="w-5 h-5" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div 
        className={`bg-background-secondary border-r border-border flex flex-col h-full transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-64 opacity-100'
        }`}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent whitespace-nowrap">
              Questro
            </h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeView === item.id ? 'default' : 'ghost'}
              className={`w-full justify-start whitespace-nowrap ${
                activeView === item.id 
                  ? 'bg-gradient-primary text-foreground' 
                  : 'hover:bg-surface'
              }`}
              onClick={() => onViewChange(item.id as any)}
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-surface whitespace-nowrap"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
