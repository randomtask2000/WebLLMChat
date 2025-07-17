import type { VectorStore, RAGDocument, SearchResult, DocumentChunk } from '$lib/types/rag';
import { cosineSimilarity } from './embedding-service';

const DB_NAME = 'WebLLM_RAG_VectorStore';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';

export class IndexedDBVectorStore implements VectorStore {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create documents store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const documentsStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
          documentsStore.createIndex('fileName', 'fileName', { unique: false });
          documentsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create chunks store
        if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
          const chunksStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
          chunksStore.createIndex('documentId', 'documentId', { unique: false });
          chunksStore.createIndex('chunkIndex', 'metadata.chunkIndex', { unique: false });
        }
      };
    });
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async addDocument(document: RAGDocument): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
      const chunksStore = transaction.objectStore(CHUNKS_STORE);

      // Store document (without chunks to avoid duplication)
      const documentToStore = { ...document, chunks: [] };
      documentsStore.put(documentToStore);

      // Store chunks separately
      for (const chunk of document.chunks) {
        chunksStore.put(chunk);
      }
    });
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
      const chunksStore = transaction.objectStore(CHUNKS_STORE);

      // Remove document
      documentsStore.delete(documentId);

      // Remove all chunks for this document
      const chunksIndex = chunksStore.index('documentId');
      const chunksRequest = chunksIndex.openCursor(IDBKeyRange.only(documentId));

      chunksRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    });
  }

  async search(queryEmbedding: number[], topK = 5, threshold = 0.1): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const chunks = await this.getAllChunks();
    const results: SearchResult[] = [];

    for (const chunk of chunks) {
      if (!chunk.embedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= threshold) {
        const document = await this.getDocument(chunk.documentId);
        if (document) {
          results.push({
            chunk,
            similarity,
            document
          });
        }
      }
    }

    // Sort by similarity and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  async getDocument(documentId: string): Promise<RAGDocument | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readonly');
      const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
      const chunksStore = transaction.objectStore(CHUNKS_STORE);

      const documentRequest = documentsStore.get(documentId);

      documentRequest.onsuccess = () => {
        const document = documentRequest.result as RAGDocument;
        if (!document) {
          resolve(null);
          return;
        }

        // Get chunks for this document
        const chunksIndex = chunksStore.index('documentId');
        const chunksRequest = chunksIndex.getAll(documentId);

        chunksRequest.onsuccess = () => {
          document.chunks = chunksRequest.result as DocumentChunk[];
          resolve(document);
        };

        chunksRequest.onerror = () => reject(chunksRequest.error);
      };

      documentRequest.onerror = () => reject(documentRequest.error);
    });
  }

  async getAllDocuments(): Promise<RAGDocument[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE], 'readonly');
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.getAll();

      request.onsuccess = async () => {
        const documents = request.result as RAGDocument[];

        // Load chunks for each document
        const documentsWithChunks = await Promise.all(
          documents.map(async (doc) => {
            const fullDoc = await this.getDocument(doc.id);
            return fullDoc || doc;
          })
        );

        resolve(documentsWithChunks);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([DOCUMENTS_STORE, CHUNKS_STORE], 'readwrite');

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);

      const documentsStore = transaction.objectStore(DOCUMENTS_STORE);
      const chunksStore = transaction.objectStore(CHUNKS_STORE);

      documentsStore.clear();
      chunksStore.clear();
    });
  }

  private async getAllChunks(): Promise<DocumentChunk[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([CHUNKS_STORE], 'readonly');
      const store = transaction.objectStore(CHUNKS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result as DocumentChunk[]);
      };

      request.onerror = () => reject(request.error);
    });
  }
}

// In-memory vector store for testing/fallback
export class MemoryVectorStore implements VectorStore {
  private documents = new Map<string, RAGDocument>();
  private chunks = new Map<string, DocumentChunk>();

  async addDocument(document: RAGDocument): Promise<void> {
    this.documents.set(document.id, { ...document });

    for (const chunk of document.chunks) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  async removeDocument(documentId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (document) {
      // Remove all chunks
      for (const chunk of document.chunks) {
        this.chunks.delete(chunk.id);
      }
      this.documents.delete(documentId);
    }
  }

  async search(queryEmbedding: number[], topK = 5, threshold = 0.1): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= threshold) {
        const document = this.documents.get(chunk.documentId);
        if (document) {
          results.push({
            chunk,
            similarity,
            document
          });
        }
      }
    }

    // Sort by similarity and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  async getDocument(documentId: string): Promise<RAGDocument | null> {
    return this.documents.get(documentId) || null;
  }

  async getAllDocuments(): Promise<RAGDocument[]> {
    return Array.from(this.documents.values());
  }

  async clear(): Promise<void> {
    this.documents.clear();
    this.chunks.clear();
  }
}

// Factory function
export function createVectorStore(type: 'indexeddb' | 'memory' = 'indexeddb'): VectorStore {
  switch (type) {
    case 'memory':
      return new MemoryVectorStore();
    case 'indexeddb':
    default:
      return new IndexedDBVectorStore();
  }
}
