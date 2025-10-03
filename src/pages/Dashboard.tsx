import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import ApiKeyManager from '@/components/dashboard/ApiKeyManager';
import ChatInterface from '@/components/dashboard/ChatInterface';
import PdfMcqConverter from '@/components/dashboard/PdfMcqConverter';
import ImageSolver from '@/components/dashboard/ImageSolver';
import History from '@/components/dashboard/History';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState<'chat' | 'pdf' | 'image' | 'history' | 'settings'>('chat');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 overflow-y-auto">
        {activeView === 'chat' && <ChatInterface />}
        {activeView === 'pdf' && <PdfMcqConverter />}
        {activeView === 'image' && <ImageSolver />}
        {activeView === 'history' && <History />}
        {activeView === 'settings' && <ApiKeyManager />}
      </main>
    </div>
  );
};

export default Dashboard;
