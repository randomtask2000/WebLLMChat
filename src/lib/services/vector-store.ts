import type { VectorStore, RAGDocument, SearchResult, DocumentChunk } from '$lib/types/rag';
import { cosineSimilarity } from './embedding-service';

const DB_NAME = 'WebLLM_RAG_VectorStore';
const DB_VERSION = 1;
const DOCUMENTS_STORE = 'documents';
const CHUNKS_STORE = 'chunks';

export class IndexedDBVectorStore implements VectorStore {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  // Creates IndexedDB vector store instance
  constructor() {
    console.log('[IndexedDBVectorStore] Constructor called');
    // Don't initialize in constructor - wait for explicit waitForReady call
  }

  // Opens IndexedDB connection and creates object stores
  private async initialize(): Promise<void> {
    console.log('[IndexedDBVectorStore] Starting initialization...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDBVectorStore] Failed to open IndexedDB:', request.error);
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        console.log('[IndexedDBVectorStore] IndexedDB opened successfully');
        this.db = request.result;
        this.isInitialized = true;
        console.log('[IndexedDBVectorStore] Initialization complete, isInitialized:', this.isInitialized);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('[IndexedDBVectorStore] Database upgrade needed');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create documents store
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          console.log('[IndexedDBVectorStore] Creating documents store');
          const documentsStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
          documentsStore.createIndex('fileName', 'fileName', { unique: false });
          documentsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Create chunks store
        if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
          console.log('[IndexedDBVectorStore] Creating chunks store');
          const chunksStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
          chunksStore.createIndex('documentId', 'documentId', { unique: false });
          chunksStore.createIndex('chunkIndex', 'metadata.chunkIndex', { unique: false });
        }
      };
    });
  }

  // Ensures database is initialized before operations
  private async ensureInitialized(): Promise<void> {
    console.log('[IndexedDBVectorStore] ensureInitialized called, isInitialized:', this.isInitialized);
    if (!this.isInitialized) {
      console.log('[IndexedDBVectorStore] Not initialized, calling initialize()');
      await this.initialize();
    } else {
      console.log('[IndexedDBVectorStore] Already initialized');
    }
  }

  // Waits for database initialization to complete
  async waitForReady(): Promise<void> {
    console.log('[IndexedDBVectorStore] waitForReady called, isInitialized:', this.isInitialized);
    await this.ensureInitialized();
    console.log('[IndexedDBVectorStore] waitForReady complete, isInitialized:', this.isInitialized);
  }

  // Stores a document and its chunks in IndexedDB
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

  // Removes a document and all its chunks from storage
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

  // Searches for similar chunks using cosine similarity
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

  // Retrieves a document with all its chunks
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

  // Returns all documents with their chunks loaded
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

  // Clears all documents and chunks from storage
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

  // Retrieves all chunks from the chunks store
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

  // Adds document to in-memory storage
  async addDocument(document: RAGDocument): Promise<void> {
    this.documents.set(document.id, { ...document });

    for (const chunk of document.chunks) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  // Removes document from memory store
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

  // Performs similarity search in memory
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

  // Gets document from memory map
  async getDocument(documentId: string): Promise<RAGDocument | null> {
    return this.documents.get(documentId) || null;
  }

  // Returns all documents from memory
  async getAllDocuments(): Promise<RAGDocument[]> {
    return Array.from(this.documents.values());
  }

  // Clears all data from memory
  async clear(): Promise<void> {
    this.documents.clear();
    this.chunks.clear();
  }

  // Always ready for memory store
  async waitForReady(): Promise<void> {
    // Memory store is always ready
    return Promise.resolve();
  }
}

// Creates appropriate vector store instance
export function createVectorStore(type: 'indexeddb' | 'memory' = 'indexeddb'): VectorStore {
  switch (type) {
    case 'memory':
      return new MemoryVectorStore();
    case 'indexeddb':
    default:
      return new IndexedDBVectorStore();
  }
}
