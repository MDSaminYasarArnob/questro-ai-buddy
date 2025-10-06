import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Add an empty assistant message that we'll stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: userMessage }]
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let assistantResponse = '';

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Update immediately for each token/character
              assistantResponse += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: assistantResponse
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save to history
      await supabase.from('chat_history').insert({
        user_id: user!.id,
        title: userMessage.substring(0, 50),
        type: 'chat',
        messages: [...messages, 
          { role: 'user', content: userMessage }, 
          { role: 'assistant', content: assistantResponse }
        ]
      });

    } catch (error: any) {
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">AI Chat Assistant</h2>
        <p className="text-muted-foreground">
          Ask anything in any language - your AI study buddy is here to help
        </p>
      </div>

      <Card className="flex-1 flex flex-col bg-background-card border-border shadow-soft overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground text-center">
                Start a conversation! Ask me anything about your studies.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-primary text-foreground'
                      : 'bg-surface text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'assistant' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(msg.content, idx)}
                    className="mt-1 h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-border">
          <div className="flex gap-3">
            <Textarea
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-surface border-border resize-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className="bg-gradient-primary hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
