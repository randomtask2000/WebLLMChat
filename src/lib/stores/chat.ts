import { writable } from 'svelte/store';
import type { ChatMessage, ChatHistory } from '../types';
import { estimateTokenCount } from '../utils/tokenCount';

export const currentMessages = writable<ChatMessage[]>([]);
export const chatHistories = writable<ChatHistory[]>([]);
export const currentChatId = writable<string | null>(null);
export const isTyping = writable(false);

function calculateTotalTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    return total + (message.tokenCount || estimateTokenCount(message.content));
  }, 0);
}

export function addMessage(message: ChatMessage) {
  if (!message.tokenCount) {
    message.tokenCount = estimateTokenCount(message.content);
  }
  currentMessages.update(messages => [...messages, message]);
}

export function updateLastMessage(content: string, chunks?: any[]) {
  currentMessages.update(messages => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = content;
      lastMessage.tokenCount = estimateTokenCount(content);
      if (chunks) lastMessage.chunks = chunks;
    }
    return messages;
  });
}

export function saveChatHistory() {
  const chatId = crypto.randomUUID();
  const timestamp = Date.now();
  
  currentMessages.subscribe(messages => {
    if (messages.length === 0) return;
    
    const title = messages[0]?.content.slice(0, 50) + '...' || 'New Chat';
    const chatHistory: ChatHistory = {
      id: chatId,
      title,
      messages,
      createdAt: timestamp,
      updatedAt: timestamp,
      totalTokens: calculateTotalTokens(messages)
    };
    
    chatHistories.update(histories => {
      const updated = [chatHistory, ...histories];
      localStorage.setItem('chat-histories', JSON.stringify(updated));
      return updated;
    });
    
    currentChatId.set(chatId);
  })();
}

export function loadChatHistory(chatId: string) {
  chatHistories.subscribe(histories => {
    const chat = histories.find(h => h.id === chatId);
    if (chat) {
      currentMessages.set(chat.messages);
      currentChatId.set(chatId);
    }
  })();
}

export function loadChatHistories() {
  const stored = localStorage.getItem('chat-histories');
  if (stored) {
    const histories: ChatHistory[] = JSON.parse(stored);
    
    // Ensure all messages have token counts and all histories have total tokens
    const updatedHistories = histories.map(history => {
      const messagesWithTokens = history.messages.map(message => ({
        ...message,
        tokenCount: message.tokenCount || estimateTokenCount(message.content)
      }));
      
      return {
        ...history,
        messages: messagesWithTokens,
        totalTokens: history.totalTokens || calculateTotalTokens(messagesWithTokens)
      };
    });
    
    chatHistories.set(updatedHistories);
    
    // Save updated data back to localStorage
    localStorage.setItem('chat-histories', JSON.stringify(updatedHistories));
  }
}

export function deleteChatHistory(chatId: string) {
  chatHistories.update(histories => {
    const updated = histories.filter(h => h.id !== chatId);
    localStorage.setItem('chat-histories', JSON.stringify(updated));
    return updated;
  });
  
  currentChatId.subscribe(currentId => {
    if (currentId === chatId) {
      currentMessages.set([]);
      currentChatId.set(null);
    }
  })();
}

export function newChat() {
  currentMessages.set([]);
  currentChatId.set(null);
}