// Represents a single message in a chat conversation
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  chunks?: DocumentChunk[];
  tokenCount?: number;
  responseTime?: number; // Response time in milliseconds for assistant messages
  documentData?: any; // Document data for preview messages with popup functionality
}

// Represents a chunk of a document with metadata
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    filename: string;
    page?: number;
    score?: number;
    similarity?: number;
    chunkIndex?: number;
    documentType?: 'pdf' | 'docx' | 'text';
    heading?: string;
    headingLevel?: number;
    totalChunks?: number;
    documentTitle?: string;
    documentAuthor?: string;
  };
}

// Represents a complete document with its chunks
export interface Document {
  id: string;
  filename: string;
  content: string;
  chunks: DocumentChunk[];
  uploadedAt: number;
  size: number;
  metadata?: {
    title?: string;
    author?: string;
    createdAt?: Date;
    pageCount?: number;
    documentType: 'pdf' | 'docx' | 'text';
  };
}

// Contains information about an available AI model
export interface ModelInfo {
  model_id: string;
  model_lib_url?: string;
  vram_required_MB?: number;
  low_resource_required?: boolean;
  description?: string;
  context_length?: number;
}

// Tracks the download progress of a model
export interface ModelDownloadProgress {
  modelId: string;
  progress: number;
  downloaded: boolean;
  downloading: boolean;
  error?: string;
}

// Stores a complete chat conversation history
export interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  totalTokens?: number;
}

// Available theme options for the UI
export type Theme =
  | 'skeleton'
  | 'wintry'
  | 'modern'
  | 'crimson'
  | 'rocket'
  | 'sahara'
  | 'hamlindigo'
  | 'gold-nouveau';
