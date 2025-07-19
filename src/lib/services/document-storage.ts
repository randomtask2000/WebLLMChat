/**
 * Document Storage Service
 * Manages saving and retrieving documents from browser storage
 * Separate from RAG context - documents stored here are not automatically loaded into RAG
 */

import { processDocument } from '$lib/utils/document-processor';
import type { RAGDocument } from '$lib/types/rag';

const STORAGE_KEY = 'document_browser_storage';

// Document structure for browser storage
export interface StoredDocument {
  id: string;
  fileName: string;
  content: string;
  originalFileData?: string; // Base64 encoded original file for binary files like PDFs
  metadata: {
    fileSize: number;
    fileType: string;
    documentType?: string;
    totalChunks: number;
    totalTokens: number;
    avgChunkSize?: number;
    processingStatus: 'pending' | 'processing' | 'completed' | 'error';
    embeddingStatus: 'pending' | 'processing' | 'completed' | 'error';
  };
  createdAt: Date;
  updatedAt: Date;
}

// Service for managing document storage in browser
class DocumentStorageService {
  private documents: Map<string, StoredDocument> = new Map();

  // Initializes service and loads stored documents
  // Initializes service and loads existing documents
  constructor() {
    this.loadFromStorage();
  }

  // Loads documents from localStorage
  // Loads documents from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const documents: StoredDocument[] = JSON.parse(stored);
        this.documents.clear();
        documents.forEach(doc => {
          // Ensure dates are properly deserialized
          doc.createdAt = new Date(doc.createdAt);
          doc.updatedAt = new Date(doc.updatedAt);
          this.documents.set(doc.id, doc);
        });
      }
    } catch (error) {
      console.error('Failed to load documents from storage:', error);
      this.documents.clear();
    }
  }

  // Persists documents to localStorage
  // Persists documents to localStorage
  private saveToStorage(): void {
    try {
      const documents = Array.from(this.documents.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
    } catch (error) {
      console.error('Failed to save documents to storage:', error);
    }
  }

  // Processes and stores document with metadata
  // Processes and stores a new document
  async addDocument(file: File): Promise<StoredDocument> {
    const id = crypto.randomUUID();
    const now = new Date();
    const fileType = this.getFileType(file.name);

    // Store original file data for binary files that need to be reconstructed
    let originalFileData: string | undefined;
    if (fileType === 'pdf' || fileType === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // Convert to base64 in chunks to avoid stack overflow
      let binaryString = '';
      const chunkSize = 0x8000; // 32KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, Array.from(chunk));
      }
      originalFileData = btoa(binaryString);
    }

    // Create initial document entry
    const document: StoredDocument = {
      id,
      fileName: file.name,
      content: '',
      originalFileData,
      metadata: {
        fileSize: file.size,
        fileType,
        totalChunks: 0,
        totalTokens: 0,
        processingStatus: 'processing',
        embeddingStatus: 'pending'
      },
      createdAt: now,
      updatedAt: now
    };

    this.documents.set(id, document);
    this.saveToStorage();

    try {
      // Process the document
      const result = await processDocument(file);
      
      // Update with processed content
      document.content = result.content;
      document.metadata.totalChunks = result.chunks.length;
      document.metadata.totalTokens = result.totalTokens;
      document.metadata.avgChunkSize = result.avgChunkSize;
      document.metadata.documentType = result.documentType;
      document.metadata.processingStatus = 'completed';
      document.updatedAt = new Date();

      this.documents.set(id, document);
      this.saveToStorage();

      return document;
    } catch (error) {
      console.error('Failed to process document:', error);
      document.metadata.processingStatus = 'error';
      document.updatedAt = new Date();
      this.documents.set(id, document);
      this.saveToStorage();
      throw error;
    }
  }

  // Retrieves document by ID
  // Retrieves document by ID
  getDocument(id: string): StoredDocument | null {
    return this.documents.get(id) || null;
  }

  // Returns all documents sorted by date
  // Returns all documents sorted by creation date
  getAllDocuments(): StoredDocument[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Deletes document and updates storage
  // Deletes document and returns success status
  removeDocument(id: string): boolean {
    const deleted = this.documents.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  // Determines file type from extension
  // Determines file type from extension
  private getFileType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'docx':
      case 'doc':
        return 'docx';
      case 'txt':
        return 'txt';
      case 'md':
      case 'markdown':
        return 'md';
      case 'csv':
        return 'csv';
      default:
        return 'unknown';
    }
  }

  // Converts to RAG-compatible format
  // Converts stored document to RAG format
  toRAGDocument(storedDoc: StoredDocument): RAGDocument {
    return {
      id: storedDoc.id,
      fileName: storedDoc.fileName,
      content: storedDoc.content,
      chunks: [], // Will be populated when loaded into RAG
      metadata: {
        fileSize: storedDoc.metadata.fileSize,
        fileType: storedDoc.metadata.fileType,
        processingStatus: storedDoc.metadata.processingStatus,
        embeddingStatus: storedDoc.metadata.embeddingStatus,
        totalChunks: storedDoc.metadata.totalChunks,
        totalTokens: storedDoc.metadata.totalTokens,
        avgChunkSize: storedDoc.metadata.avgChunkSize
      },
      createdAt: storedDoc.createdAt,
      updatedAt: storedDoc.updatedAt,
      originalFileData: storedDoc.originalFileData // Include original file data for popup functionality
    };
  }

  // Clears all stored documents
  // Removes all documents from storage
  clear(): void {
    this.documents.clear();
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Export singleton instance
export const documentStorageService = new DocumentStorageService();