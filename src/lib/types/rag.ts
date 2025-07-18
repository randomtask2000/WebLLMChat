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

export interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
  document: RAGDocument;
}

export interface RAGQueryResult {
  query: string;
  results: SearchResult[];
  contextUsed: string;
  tokensUsed: number;
}

export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  getDimensions(): number;
  isReady(): boolean;
}

export interface VectorStore {
  addDocument(document: RAGDocument): Promise<void>;
  removeDocument(documentId: string): Promise<void>;
  search(queryEmbedding: number[], topK?: number, threshold?: number): Promise<SearchResult[]>;
  getDocument(documentId: string): Promise<RAGDocument | null>;
  getAllDocuments(): Promise<RAGDocument[]>;
  clear(): Promise<void>;
  waitForReady?(): Promise<void>;
}

export interface RAGService {
  addDocument(file: File): Promise<string>;
  removeDocument(documentId: string): Promise<void>;
  search(query: string, topK?: number): Promise<RAGQueryResult>;
  getDocuments(): Promise<RAGDocument[]>;
  isReady(): boolean;
}
