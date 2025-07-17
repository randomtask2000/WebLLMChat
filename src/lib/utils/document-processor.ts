import type { Document, DocumentChunk } from '../types';
import mammoth from 'mammoth';

interface DocumentMetadata {
  title?: string;
  author?: string;
  createdAt?: Date;
  pageCount?: number;
  documentType: 'pdf' | 'docx' | 'text';
}

interface ExtractedContent {
  text: string;
  metadata: DocumentMetadata;
  structuredContent?: StructuredContent[];
}

interface StructuredContent {
  type: 'heading' | 'paragraph' | 'list' | 'table';
  level?: number; // For headings
  content: string;
  pageNumber?: number;
}

export async function processDocument(file: File): Promise<Document> {
  const extractedContent = await extractContent(file);
  const chunks = createSmartChunks(extractedContent, file.name);

  return {
    id: crypto.randomUUID(),
    filename: file.name,
    content: extractedContent.text,
    chunks,
    uploadedAt: Date.now(),
    size: file.size,
    metadata: extractedContent.metadata
  };
}

async function extractContent(file: File): Promise<ExtractedContent> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Check file extension as fallback for MIME type
  if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return await extractTextFromPlainText(file);
  }

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await extractTextFromPDF(file);
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return await extractTextFromDOCX(file);
  }

  throw new Error(`Unsupported file type: ${fileType || 'unknown'}`);
}

async function extractTextFromPlainText(file: File): Promise<ExtractedContent> {
  const text = await file.text();
  return {
    text,
    metadata: {
      documentType: 'text',
      createdAt: new Date(file.lastModified)
    }
  };
}

async function extractTextFromPDF(file: File): Promise<ExtractedContent> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    const structuredContent: StructuredContent[] = [];
    let fullText = '';

    // Extract metadata
    const metadata = await pdf.getMetadata();
    const documentMetadata: DocumentMetadata = {
      documentType: 'pdf',
      pageCount: pdf.numPages,
      title: metadata.info?.Title,
      author: metadata.info?.Author,
      createdAt: metadata.info?.CreationDate ? new Date(metadata.info.CreationDate) : undefined
    };

    // Extract text page by page with structure preservation
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = '';
      let currentParagraph = '';
      let lastY = null;
      
      // Group text items by position to detect paragraphs
      for (const item of textContent.items as any[]) {
        const text = item.str.trim();
        if (!text) continue;
        
        // Detect paragraph breaks based on Y position changes
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 20) {
          if (currentParagraph) {
            structuredContent.push({
              type: 'paragraph',
              content: currentParagraph.trim(),
              pageNumber: pageNum
            });
            pageText += currentParagraph.trim() + '\n\n';
            currentParagraph = '';
          }
        }
        
        currentParagraph += text + ' ';
        lastY = item.transform[5];
      }
      
      // Add remaining paragraph
      if (currentParagraph) {
        structuredContent.push({
          type: 'paragraph',
          content: currentParagraph.trim(),
          pageNumber: pageNum
        });
        pageText += currentParagraph.trim() + '\n';
      }
      
      fullText += pageText + '\n';
    }

    return {
      text: fullText.trim(),
      metadata: documentMetadata,
      structuredContent
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error('Failed to process PDF file: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function extractTextFromDOCX(file: File): Promise<ExtractedContent> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract raw text and messages for structure analysis
    const result = await mammoth.extractRawText({ arrayBuffer });
    const messagesResult = await mammoth.convertToHtml({ arrayBuffer });
    
    // Parse structure from messages
    const structuredContent: StructuredContent[] = [];
    let fullText = result.value;
    
    // Basic metadata
    const documentMetadata: DocumentMetadata = {
      documentType: 'docx',
      createdAt: new Date(file.lastModified)
    };
    
    // Try to extract structure from HTML conversion
    if (messagesResult.value) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = messagesResult.value;
      
      // Extract headings
      const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.substring(1));
        structuredContent.push({
          type: 'heading',
          level,
          content: heading.textContent || ''
        });
      });
      
      // Extract paragraphs
      const paragraphs = tempDiv.querySelectorAll('p');
      paragraphs.forEach((p) => {
        if (p.textContent?.trim()) {
          structuredContent.push({
            type: 'paragraph',
            content: p.textContent.trim()
          });
        }
      });
      
      // Extract lists
      const lists = tempDiv.querySelectorAll('ul, ol');
      lists.forEach((list) => {
        const items = Array.from(list.querySelectorAll('li'))
          .map(li => '• ' + li.textContent?.trim())
          .join('\n');
        if (items) {
          structuredContent.push({
            type: 'list',
            content: items
          });
        }
      });
    }
    
    // Log any conversion messages/warnings
    if (messagesResult.messages && messagesResult.messages.length > 0) {
      console.log('DOCX conversion messages:', messagesResult.messages);
    }
    
    return {
      text: fullText,
      metadata: documentMetadata,
      structuredContent: structuredContent.length > 0 ? structuredContent : undefined
    };
  } catch (error) {
    console.error('DOCX processing error:', error);
    throw new Error('Failed to process DOCX file: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

function createSmartChunks(
  extractedContent: ExtractedContent,
  filename: string,
  options: {
    chunkSize?: number;
    overlapSize?: number;
    preserveStructure?: boolean;
  } = {}
): DocumentChunk[] {
  const {
    chunkSize = 500, // Smaller chunks for better precision
    overlapSize = 50,
    preserveStructure = true
  } = options;

  const chunks: DocumentChunk[] = [];
  
  // If we have structured content and want to preserve it
  if (preserveStructure && extractedContent.structuredContent && extractedContent.structuredContent.length > 0) {
    let currentChunk = '';
    let currentTokens = 0;
    let chunkMetadata: any = { filename };
    
    for (const section of extractedContent.structuredContent) {
      const sectionText = section.content;
      const sectionTokens = estimateTokens(sectionText);
      
      // If this section would make the chunk too large, save current chunk
      if (currentTokens + sectionTokens > chunkSize && currentChunk) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentChunk.trim(),
          metadata: { ...chunkMetadata }
        });
        
        // Start new chunk with overlap
        const overlapText = getOverlapText(currentChunk, overlapSize);
        currentChunk = overlapText + ' ' + sectionText;
        currentTokens = estimateTokens(currentChunk);
        chunkMetadata = { filename };
      } else {
        // Add to current chunk
        currentChunk += (currentChunk ? '\n' : '') + sectionText;
        currentTokens += sectionTokens;
      }
      
      // Add section metadata
      if (section.type === 'heading') {
        chunkMetadata.heading = section.content;
        chunkMetadata.headingLevel = section.level;
      }
      if (section.pageNumber) {
        chunkMetadata.page = section.pageNumber;
      }
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        metadata: { ...chunkMetadata }
      });
    }
  } else {
    // Fallback to sentence-based chunking
    const sentences = extractedContent.text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence.trim() + '.';
      
      if (currentChunk.length + sentenceWithPunctuation.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          id: crypto.randomUUID(),
          content: currentChunk.trim(),
          metadata: {
            filename,
            chunkIndex,
            documentType: extractedContent.metadata.documentType
          }
        });
        
        // Create overlap
        const overlapText = getOverlapText(currentChunk, overlapSize);
        currentChunk = overlapText + ' ' + sentenceWithPunctuation;
        chunkIndex++;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        metadata: {
          filename,
          chunkIndex,
          documentType: extractedContent.metadata.documentType
        }
      });
    }
  }

  // Add document-level metadata to all chunks
  chunks.forEach(chunk => {
    chunk.metadata = {
      ...chunk.metadata,
      totalChunks: chunks.length,
      documentTitle: extractedContent.metadata.title,
      documentAuthor: extractedContent.metadata.author,
      documentType: extractedContent.metadata.documentType
    };
  });

  return chunks;
}

function getOverlapText(text: string, overlapSize: number): string {
  const words = text.split(/\s+/);
  const overlapWords = words.slice(-Math.min(overlapSize, words.length));
  return overlapWords.join(' ');
}

function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters or 0.75 words
  return Math.ceil(text.split(/\s+/).length * 0.75);
}

export function isValidFileType(file: File): boolean {
  const allowedTypes = [
    'text/plain',
    'text/markdown',
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  const allowedExtensions = ['.txt', '.md', '.pdf', '.csv', '.docx'];
  const fileName = file.name.toLowerCase();
  
  return allowedTypes.includes(file.type) || allowedExtensions.some(ext => fileName.endsWith(ext));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}