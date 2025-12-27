import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Json } from '@/integrations/supabase/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
}

export interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  type: string;
}

export const useChatHistory = () => {
  const [chats, setChats] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load chats from database on mount
  const fetchChats = useCallback(async () => {
    if (!user) {
      setChats([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'chat')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chat history:', error);
        setChats([]);
      } else {
        const formattedChats: ChatHistory[] = (data || []).map(chat => ({
          id: chat.id,
          title: chat.title,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          messages: Array.isArray(chat.messages) ? (chat.messages as unknown as Message[]) : [],
          type: chat.type,
        }));
        setChats(formattedChats);
      }
    } catch (e) {
      console.error('Error fetching chat history:', e);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const createChat = useCallback(async (title: string, messages: Message[]): Promise<string | null> => {
    if (!user) return null;

    // Don't store base64 file data in database - only text content
    const sanitizedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      // Remove fileUrl to avoid storing base64 data
    }));

    try {
      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          title,
          type: 'chat',
          messages: sanitizedMessages as unknown as Json,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating chat:', error);
        return null;
      }

      // Refresh the list
      await fetchChats();
      return data?.id || null;
    } catch (e) {
      console.error('Error creating chat:', e);
      return null;
    }
  }, [user, fetchChats]);

  const updateChat = useCallback(async (chatId: string, messages: Message[]) => {
    if (!user) return;

    // Don't store base64 file data in database - only text content
    const sanitizedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      const { error } = await supabase
        .from('chat_history')
        .update({
          messages: sanitizedMessages as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating chat:', error);
      } else {
        await fetchChats();
      }
    } catch (e) {
      console.error('Error updating chat:', e);
    }
  }, [user, fetchChats]);

  const deleteChat = useCallback(async (chatId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting chat:', error);
      } else {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
      }
    } catch (e) {
      console.error('Error deleting chat:', e);
    }
  }, [user]);

  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_history')
        .update({
          title: newTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', chatId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error renaming chat:', error);
      } else {
        setChats(prev => prev.map(chat => 
          chat.id === chatId 
            ? { ...chat, title: newTitle, updated_at: new Date().toISOString() }
            : chat
        ));
      }
    } catch (e) {
      console.error('Error renaming chat:', e);
    }
  }, [user]);

  const getChat = useCallback((chatId: string): ChatHistory | undefined => {
    return chats.find(chat => chat.id === chatId);
  }, [chats]);

  const refresh = useCallback(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    loading,
    createChat,
    updateChat,
    deleteChat,
    renameChat,
    getChat,
    refresh,
  };
};
