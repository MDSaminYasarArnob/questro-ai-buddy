import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatInterface from '@/components/dashboard/ChatInterface';
import PdfMcqConverter from '@/components/dashboard/PdfMcqConverter';
import ImageSolver from '@/components/dashboard/ImageSolver';
import SmartSummaries from '@/components/dashboard/SmartSummaries';
import DiagramGenerator from '@/components/dashboard/DiagramGenerator';
import History from '@/components/dashboard/History';
import ApiKeyManager from '@/components/dashboard/ApiKeyManager';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState<'chat' | 'pdf' | 'image' | 'summary' | 'diagram' | 'history' | 'settings'>('chat');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        {/* Loading background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-glow" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse-glow">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Background mesh gradient */}
      <div className="fixed inset-0 bg-gradient-mesh pointer-events-none z-0" />
      
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 overflow-y-auto relative z-10">
        {activeView === 'chat' && <ChatInterface />}
        {activeView === 'pdf' && <PdfMcqConverter />}
        {activeView === 'image' && <ImageSolver />}
        {activeView === 'summary' && <SmartSummaries />}
        {activeView === 'diagram' && <DiagramGenerator />}
        {activeView === 'history' && <History />}
        {activeView === 'settings' && <ApiKeyManager />}
      </main>
    </div>
  );
};

export default Dashboard;
