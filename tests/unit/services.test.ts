import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { 
  TFIDFEmbeddingProvider,
  WebLLMEmbeddingProvider,
  cosineSimilarity
} from '$lib/services/embedding-service';
import { ragService } from '$lib/services/rag-service';
import { 
  documentStorageService as documentStorage 
} from '$lib/services/document-storage';
import { documents } from '$lib/stores/documents';
import type { Document } from '$lib/types';

// Mock WebLLM
vi.mock('$lib/utils/webllm', () => ({
  createMLCEngine: vi.fn(() => ({
    embeddings: vi.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3, 0.4, 0.5] }]
    })
  }))
}));

// Mock document processor
vi.mock('$lib/utils/document-processor', () => ({
  processDocument: vi.fn().mockResolvedValue({
    id: '1',
    filename: 'test.txt',
    content: 'Test content',
    chunks: [{ text: 'Test content', metadata: {} }],
    size: 100,
    uploadedAt: Date.now(),
    metadata: {
      fileType: 'text/plain',
      documentType: 'text',
      totalChunks: 1,
      totalTokens: 10
    }
  })
}));

describe('Embedding Service', () => {
  describe('TFIDFEmbeddingProvider', () => {
    let provider: TFIDFEmbeddingProvider;

    beforeEach(() => {
      provider = new TFIDFEmbeddingProvider();
    });

    it('should generate embeddings for text', async () => {
      const text = 'Test text for embedding';
      const embedding = await provider.generateEmbedding(text);
      
      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      const embedding = await provider.generateEmbedding('');
      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
    });

    it('should be ready after initialization', () => {
      expect(provider.isReady()).toBe(true);
    });
  });

  describe('WebLLMEmbeddingProvider', () => {
    it('should be defined', () => {
      expect(WebLLMEmbeddingProvider).toBeDefined();
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity between vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });

    it('should return 1 for identical vectors', () => {
      const vec = [0.5, 0.5, 0.5];
      const similarity = cosineSimilarity(vec, vec);
      expect(similarity).toBeCloseTo(1);
    });

    it('should handle zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 1, 1];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBe(0);
    });
  });
});

describe('RAG Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    documents.set([]);
    // Initialize the service with mock providers
    const embeddingProvider = new TFIDFEmbeddingProvider();
    await ragService.initialize(embeddingProvider, {
      add: vi.fn(),
      search: vi.fn().mockResolvedValue([]),
      remove: vi.fn(),
      clear: vi.fn(),
      size: vi.fn().mockReturnValue(0),
      getAllDocuments: vi.fn().mockResolvedValue([])
    } as any);
  });

  describe('search', () => {
    it('should perform semantic search', async () => {
      const mockDocuments: Document[] = [{
        id: '1',
        filename: 'test.txt',
        content: 'This is about machine learning',
        chunks: [{
          text: 'Machine learning is a subset of AI',
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          metadata: {}
        }],
        uploadedAt: Date.now(),
        size: 100
      }];

      documents.set(mockDocuments);
      
      const results = await ragService.search('What is machine learning?');
      
      expect(results).toBeDefined();
      expect(results.matchedChunks).toBeDefined();
      expect(Array.isArray(results.matchedChunks)).toBe(true);
    });

    it('should handle no documents', async () => {
      documents.set([]);
      
      const results = await ragService.search('Any query');
      expect(results).toBeDefined();
      expect(results.matchedChunks).toBeDefined();
      expect(Array.isArray(results.matchedChunks)).toBe(true);
    });
  });

  describe('addDocument', () => {
    it('should add document to the service', async () => {
      const file = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      
      const docId = await ragService.addDocument(file);
      expect(docId).toBeDefined();
      expect(typeof docId).toBe('string');
    });
  });

  describe('getDocuments', () => {
    it('should retrieve documents', async () => {
      const docs = await ragService.getDocuments();
      expect(docs).toBeDefined();
      expect(Array.isArray(docs)).toBe(true);
    });
  });
});

describe('Document Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    documentStorage.clear();
  });

  describe('addDocument', () => {
    it('should add document to storage', async () => {
      const file = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      
      const saved = await documentStorage.addDocument(file);
      
      expect(saved).toBeDefined();
      expect(saved.fileName).toBe('test.txt');
    });
  });

  describe('getAllDocuments', () => {
    it('should retrieve all documents', async () => {
      const file1 = new File(['Content 1'], 'test1.txt', { type: 'text/plain' });
      const file2 = new File(['Content 2'], 'test2.txt', { type: 'text/plain' });

      await documentStorage.addDocument(file1);
      await documentStorage.addDocument(file2);

      const docs = documentStorage.getAllDocuments();
      expect(docs).toHaveLength(2);
    });
  });

  describe('getDocument', () => {
    it('should retrieve document by id', async () => {
      const file = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      const saved = await documentStorage.addDocument(file);
      
      const retrieved = documentStorage.getDocument(saved.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.fileName).toBe('test.txt');
    });
  });

  describe('removeDocument', () => {
    it('should remove document from storage', async () => {
      const file = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      const saved = await documentStorage.addDocument(file);
      
      const removed = documentStorage.removeDocument(saved.id);
      expect(removed).toBe(true);
      
      const deleted = documentStorage.getDocument(saved.id);
      expect(deleted).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all documents', async () => {
      const file = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      await documentStorage.addDocument(file);
      
      documentStorage.clear();
      
      const docs = documentStorage.getAllDocuments();
      expect(docs).toHaveLength(0);
    });
  });
});