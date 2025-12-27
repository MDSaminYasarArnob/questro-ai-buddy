import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Sparkles, Trash2 } from 'lucide-react';

const ApiKeyManager = () => {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const clearChatHistory = () => {
    if (confirm('Clear all chat history? This cannot be undone.')) {
      localStorage.removeItem('questro_chat_history');
      toast({
        title: "Success",
        description: "Chat history cleared",
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold neon-text">Settings</h2>
          </div>
          <p className="text-muted-foreground">
            Manage your account settings
          </p>
        </div>
        <Button
          onClick={handleSignOut}
          variant="destructive"
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      <Card className="p-6 bg-background-card border-border shadow-soft mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">AI Service</h3>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-medium text-green-400">AI Service Active</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Questro uses built-in AI capabilities. No API key configuration needed - 
              everything is ready to use out of the box!
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">✨ Features powered by AI:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Chat Assistant for any subject</li>
              <li>Image Problem Solver</li>
              <li>PDF to MCQ Converter</li>
              <li>Smart Summaries</li>
              <li>Diagram Generator</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-background-card border-border shadow-soft">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="w-6 h-6 text-destructive" />
          <h3 className="text-xl font-semibold">Privacy</h3>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your chat history is stored locally on this device for convenience. 
            You can clear it at any time for privacy.
          </p>

          <Button
            onClick={clearChatHistory}
            variant="outline"
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Chat History
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ApiKeyManager;
