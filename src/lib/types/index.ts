export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  chunks?: DocumentChunk[];
  tokenCount?: number;
  responseTime?: number; // Response time in milliseconds for assistant messages
}

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

export interface ModelInfo {
  model_id: string;
  model_lib_url?: string;
  vram_required_MB?: number;
  low_resource_required?: boolean;
  description?: string;
  context_length?: number;
}

export interface ModelDownloadProgress {
  modelId: string;
  progress: number;
  downloaded: boolean;
  downloading: boolean;
  error?: string;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  totalTokens?: number;
}

export type Theme =
  | 'skeleton'
  | 'wintry'
  | 'modern'
  | 'crimson'
  | 'rocket'
  | 'sahara'
  | 'hamlindigo'
  | 'gold-nouveau';
