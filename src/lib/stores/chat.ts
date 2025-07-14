import { writable } from 'svelte/store';
import type { ChatMessage, ChatHistory } from '../types';
import { estimateTokenCount } from '../utils/tokenCount';

export const currentMessages = writable<ChatMessage[]>([]);
export const chatHistories = writable<ChatHistory[]>([]);
export const currentChatId = writable<string | null>(null);
export const isTyping = writable(false);

// Response timing tracking
let responseStartTime: number | null = null;

function calculateTotalTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    return total + (message.tokenCount || estimateTokenCount(message.content));
  }, 0);
}

export function addMessage(message: ChatMessage) {
  if (!message.tokenCount) {
    message.tokenCount = estimateTokenCount(message.content);
  }
  console.log(`Adding message: "${message.content.slice(0, 50)}..." with ${message.tokenCount} tokens`);
  currentMessages.update(messages => [...messages, message]);
}

export function startResponseTiming() {
  responseStartTime = performance.now();
}

export function updateLastMessage(content: string, chunks?: any[], isComplete: boolean = false) {
  currentMessages.update(messages => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const tokenCount = estimateTokenCount(content);
      console.log(`Updating message: "${content.slice(0, 50)}..." with ${tokenCount} tokens`);
      
      // Calculate response time if this is the final update
      let responseTime = lastMessage.responseTime;
      if (isComplete && responseStartTime !== null) {
        responseTime = performance.now() - responseStartTime;
        responseStartTime = null; // Reset for next response
      }
      
      // Create a new message object to ensure Svelte reactivity
      const updatedMessage = {
        ...lastMessage,
        content,
        tokenCount,
        ...(chunks && { chunks }),
        ...(responseTime !== undefined && { responseTime })
      };
      
      // Replace the last message with the updated one
      return [...messages.slice(0, -1), updatedMessage];
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

export function retryLastUserMessage(): string | null {
  let lastUserMessage: string | null = null;
  
  currentMessages.update(messages => {
    // Find the last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessage = messages[i].content;
        // Remove all messages after and including this user message
        return messages.slice(0, i);
      }
    }
    return messages;
  });
  
  return lastUserMessage;
}