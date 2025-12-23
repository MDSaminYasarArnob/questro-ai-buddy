import { useState, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileUrl?: string;
}

export interface LocalChatHistory {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

const STORAGE_KEY = 'questro_chat_history';

export const useLocalChatHistory = () => {
  const [chats, setChats] = useState<LocalChatHistory[]>([]);

  // Load chats from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setChats(parsed);
      } catch (e) {
        console.error('Error parsing chat history:', e);
        setChats([]);
      }
    }
  }, []);

  // Save chats to localStorage whenever they change
  const saveToStorage = useCallback((updatedChats: LocalChatHistory[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChats));
    setChats(updatedChats);
  }, []);

  const createChat = useCallback((title: string, messages: Message[]): string => {
    const newChat: LocalChatHistory = {
      id: crypto.randomUUID(),
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages,
    };
    
    const updatedChats = [newChat, ...chats];
    saveToStorage(updatedChats);
    return newChat.id;
  }, [chats, saveToStorage]);

  const updateChat = useCallback((chatId: string, messages: Message[]) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, messages, updated_at: new Date().toISOString() }
        : chat
    );
    // Sort by updated_at descending
    updatedChats.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    saveToStorage(updatedChats);
  }, [chats, saveToStorage]);

  const deleteChat = useCallback((chatId: string) => {
    const updatedChats = chats.filter(chat => chat.id !== chatId);
    saveToStorage(updatedChats);
  }, [chats, saveToStorage]);

  const renameChat = useCallback((chatId: string, newTitle: string) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: newTitle, updated_at: new Date().toISOString() }
        : chat
    );
    saveToStorage(updatedChats);
  }, [chats, saveToStorage]);

  const getChat = useCallback((chatId: string): LocalChatHistory | undefined => {
    return chats.find(chat => chat.id === chatId);
  }, [chats]);

  return {
    chats,
    createChat,
    updateChat,
    deleteChat,
    renameChat,
    getChat,
  };
};
