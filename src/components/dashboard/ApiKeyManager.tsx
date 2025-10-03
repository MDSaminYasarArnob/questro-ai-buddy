import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Key, Eye, EyeOff, Trash2, Save, ExternalLink } from 'lucide-react';

const ApiKeyManager = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadApiKey();
  }, [user]);

  const loadApiKey = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading API key:', error);
      return;
    }

    if (data) {
      setApiKey(data.api_key);
      setHasKey(true);
    }
  };

  const saveApiKey = async () => {
    if (!user || !apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from('api_keys')
      .upsert({
        user_id: user.id,
        api_key: apiKey.trim(),
      });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setHasKey(true);
      toast({
        title: "Success",
        description: "API key saved successfully",
      });
    }
  };

  const deleteApiKey = async () => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('user_id', user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setApiKey('');
      setHasKey(false);
      toast({
        title: "Success",
        description: "API key deleted successfully",
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">API Key Settings</h2>
        <p className="text-muted-foreground">
          Manage your Gemini API key to use Questro's features
        </p>
      </div>

      <Card className="p-6 bg-background-card border-border shadow-soft mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Gemini API Key</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Your API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                placeholder="AIza..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-surface border-border pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={saveApiKey}
              disabled={loading || !apiKey.trim()}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Save className="w-4 h-4 mr-2" />
              {hasKey ? 'Update Key' : 'Save Key'}
            </Button>

            {hasKey && (
              <Button
                onClick={deleteApiKey}
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Key
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-surface/50 border-border">
        <h4 className="font-semibold mb-3">How to get your Gemini API key:</h4>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Visit Google AI Studio</li>
          <li>Sign in with your Google account</li>
          <li>Click on "Get API Key"</li>
          <li>Create a new API key or use an existing one</li>
          <li>Copy and paste it here</li>
        </ol>
        <Button
          variant="outline"
          className="mt-4 border-primary text-primary hover:bg-primary/10"
          onClick={() => window.open('https://makersuite.google.com/app/apikey', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Get API Key
        </Button>
      </Card>
    </div>
  );
};

export default ApiKeyManager;
