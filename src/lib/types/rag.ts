// Represents a document chunk with embedding for RAG
export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata: {
    fileName: string;
    chunkIndex: number;
    startPosition: number;
    endPosition: number;
    tokenCount: number;
  };
  createdAt: Date;
}

// Document with chunks and processing metadata for RAG
export interface RAGDocument {
  id: string;
  fileName: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: {
    fileSize: number;
    fileType: string;
    processingStatus: 'pending' | 'processing' | 'completed' | 'error';
    embeddingStatus: 'pending' | 'processing' | 'completed' | 'error';
    totalChunks: number;
    totalTokens: number;
    avgChunkSize?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  originalFileData?: string; // Base64 encoded original file data for popup functionality
}

// Result from vector similarity search
export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
  document: RAGDocument;
}

// Complete RAG query response with context
export interface RAGQueryResult {
  query: string;
  results: SearchResult[];
  contextUsed: string;
  tokensUsed: number;
}

// Interface for generating text embeddings
export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  getDimensions(): number;
  isReady(): boolean;
}

// Interface for storing and searching document vectors
export interface VectorStore {
  addDocument(document: RAGDocument): Promise<void>;
  removeDocument(documentId: string): Promise<void>;
  search(queryEmbedding: number[], topK?: number, threshold?: number): Promise<SearchResult[]>;
  getDocument(documentId: string): Promise<RAGDocument | null>;
  getAllDocuments(): Promise<RAGDocument[]>;
  clear(): Promise<void>;
  waitForReady?(): Promise<void>;
}

// Interface for RAG document management and search
export interface RAGService {
  addDocument(file: File): Promise<string>;
  removeDocument(documentId: string): Promise<void>;
  search(query: string, topK?: number): Promise<RAGQueryResult>;
  getDocuments(): Promise<RAGDocument[]>;
  isReady(): boolean;
}
