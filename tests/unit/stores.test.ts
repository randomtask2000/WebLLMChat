import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { currentMessages, addMessage, updateLastMessage } from '$lib/stores/chat';
import { setTheme, currentTheme } from '$lib/stores/theme';
import { documents, addDocument, removeDocument } from '$lib/stores/documents';
import type { ChatMessage, Document } from '$lib/types';

describe('Chat Store', () => {
  beforeEach(() => {
    currentMessages.set([]);
  });

  it('should add messages to the store', () => {
    const message: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now()
    };

    addMessage(message);
    const messages = get(currentMessages);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(message);
  });

  it('should update the last message', () => {
    const userMessage: ChatMessage = {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now()
    };

    const assistantMessage: ChatMessage = {
      id: '2',
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };

    addMessage(userMessage);
    addMessage(assistantMessage);

    updateLastMessage('Hello there!');

    const messages = get(currentMessages);
    expect(messages[1].content).toBe('Hello there!');
  });
});

describe('Theme Store', () => {
  it('should update theme', () => {
    setTheme('wintry');
    expect(get(currentTheme)).toBe('wintry');
  });
});

describe('Documents Store', () => {
  beforeEach(() => {
    documents.set([]);
  });

  it('should add documents', () => {
    const doc: Document = {
      id: '1',
      filename: 'test.txt',
      content: 'Test content',
      chunks: [],
      uploadedAt: Date.now(),
      size: 100
    };

    addDocument(doc);
    const docs = get(documents);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual(doc);
  });

  it('should remove documents', () => {
    const doc: Document = {
      id: '1',
      filename: 'test.txt',
      content: 'Test content',
      chunks: [],
      uploadedAt: Date.now(),
      size: 100
    };

    addDocument(doc);
    removeDocument('1');

    const docs = get(documents);
    expect(docs).toHaveLength(0);
  });
});
