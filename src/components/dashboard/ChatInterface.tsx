import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, Copy, Check, Paperclip, X, Bot, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useChatHistory, ChatHistory } from '@/hooks/useChatHistory';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import ChatSidebar from './ChatSidebar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
}

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { chats, createChat, updateChat, deleteChat, renameChat, refresh } = useChatHistory();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Expanded image format support
    const validImageTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp', 
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/avif',
      'image/heic',
      'image/heif'
    ];
    const validDocTypes = ['application/pdf'];
    const validTypes = [...validImageTypes, ...validDocTypes];
    
    // Also check by extension for formats that may not have correct MIME type
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'tiff', 'tif', 'avif', 'heic', 'heif', 'pdf'];
    
    const isValidType = validTypes.includes(file.type) || validExtensions.includes(extension || '');
    
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image (JPG, PNG, WEBP, GIF, BMP, SVG, TIFF, AVIF, HEIC) or PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 20MB",
        variant: "destructive",
      });
      return;
    }

    setUploadedFile(file);
    
    // Generate preview for image files
    const isImage = validImageTypes.includes(file.type) || 
      ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg', 'tiff', 'tif', 'avif'].includes(extension || '');
    
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    e.target.value = '';
  };

  const removeFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
  };

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

  const handleSelectChat = (chat: ChatHistory | null) => {
    if (chat) {
      setCurrentChatId(chat.id);
      setMessages(chat.messages || []);
    }
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setMessage('');
    setUploadedFile(null);
    setFilePreview(null);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    if (currentChatId === chatId) {
      handleNewChat();
    }
  };

  const handleRenameChat = async (chatId: string, newTitle: string) => {
    await renameChat(chatId, newTitle);
  };

  const handleSend = async () => {
    if (!message.trim() && !uploadedFile) return;

    const userMessage = message;
    let fileBase64 = null;
    let fileType = null;
    const currentFile = uploadedFile;
    
    if (uploadedFile) {
      const reader = new FileReader();
      fileBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64String = reader.result?.toString();
          if (base64String) {
            resolve(base64String.split(',')[1]);
          }
        };
        reader.readAsDataURL(uploadedFile);
      });
      fileType = uploadedFile.type;
    }

    setMessage('');
    setUploadedFile(null);
    setFilePreview(null);
    
    const newUserMessage: Message = { 
      role: 'user', 
      content: userMessage,
      fileUrl: filePreview || undefined
    };
    
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setLoading(true);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      if (!session?.access_token) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to use the chat",
          variant: "destructive",
        });
        setMessages(prev => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          fileBase64,
          fileType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }));
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        if (response.status === 402) {
          throw new Error('AI service quota exceeded. Please add credits to continue.');
        }
        throw new Error(errorData.error || 'Failed to get response');
      }
      
      if (!response.body) {
        throw new Error('No response body');
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
              assistantResponse += content;
              const currentResponse = assistantResponse;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: currentResponse
                  };
                }
                return newMessages;
              });
            }
          } catch {
            // Skip malformed JSON chunks instead of re-buffering
            continue;
          }
        }
      }

      const finalMessages = [...updatedMessages, { role: 'assistant' as const, content: assistantResponse }];
      
      if (currentChatId) {
        await updateChat(currentChatId, finalMessages);
      } else {
        const historyTitle = currentFile 
          ? `File: ${currentFile.name.substring(0, 30)}`
          : userMessage.substring(0, 50);
          
        const newId = await createChat(historyTitle, finalMessages);
        if (newId) {
          setCurrentChatId(newId);
        }
      }

    } catch (error: any) {
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
    <div className="h-full flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col p-6">

        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold neon-text">AI Chat Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Your intelligent study companion powered by advanced AI
              </p>
            </div>
          </div>
        </div>

        <Card className="flex-1 flex flex-col glass-card glow-border rounded-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-card border border-primary/30 flex items-center justify-center">
                  <Bot className="w-12 h-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">Start a conversation</h3>
                  <p className="text-muted-foreground max-w-md">
                    Ask me anything about your studies. I can help with math, science, coding, and more!
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {['Explain quantum physics', 'Help with calculus', 'Debug my code', 'Essay writing tips'].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setMessage(suggestion)}
                      className="px-4 py-2 rounded-xl text-sm font-medium glass-card border border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-colors duration-200 text-muted-foreground hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-4 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                      msg.role === 'user' 
                        ? 'bg-gradient-primary' 
                        : 'glass-card border border-primary/30'
                    }`}>
                      {msg.role === 'user' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className={`flex flex-col max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`p-4 rounded-2xl ${
                          msg.role === 'user'
                            ? 'neon-button text-white rounded-tr-sm'
                            : 'glass-card border border-border/50 text-foreground rounded-tl-sm'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <div className="space-y-2">
                            {msg.fileUrl && (
                              <img src={msg.fileUrl} alt="Uploaded" className="max-w-xs rounded-lg" />
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ) : (
                          <div className="prose prose-invert max-w-none prose-p:my-2 prose-headings:text-foreground prose-code:text-accent prose-strong:text-foreground">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {msg.role === 'assistant' && msg.content && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(msg.content, idx)}
                          className="mt-2 h-8 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="w-3 h-3 mr-1 text-green-400" />
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
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="p-4 border-t border-border/50 bg-background/80">
            {uploadedFile && (
              <div className="mb-3 p-3 glass-card rounded-xl flex items-center justify-between border border-border/50">
                <div className="flex items-center gap-3">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Paperclip className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-muted-foreground">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={loading}
                  className="hover:bg-destructive/10 hover:text-destructive rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-3">
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Ask me anything..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="glass-card border-border/50 focus:border-primary/50 resize-none rounded-xl min-h-[80px] text-foreground placeholder:text-muted-foreground"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/tiff,image/avif,image/heic,image/heif,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.tiff,.tif,.avif,.heic,.heif,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || !!uploadedFile}
                  className="glass-card border-border/50 hover:border-primary/50 hover:bg-primary/10 rounded-xl"
                >
                  <Paperclip className="w-4 h-4 mr-2 text-primary" />
                  Attach File
                </Button>
              </div>
              <Button
                onClick={handleSend}
                disabled={loading || (!message.trim() && !uploadedFile)}
                className="neon-button rounded-xl self-end h-12 w-12 p-0"
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

      {/* Chat Sidebar */}
      <ChatSidebar
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        chats={chats}
      />
    </div>
  );
};

export default ChatInterface;