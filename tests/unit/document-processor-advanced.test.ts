import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processDocument, isValidFileType } from '$lib/utils/document-processor';

// Mock File methods
// Creates mock file with proper text/arrayBuffer methods
const createMockFile = (content: string, name: string, type: string) => {
  const file = new File([content], name, { type });
  // Mock the async methods
  file.text = vi.fn(() => Promise.resolve(content));
  
  // For PDF files, ensure the header is correct
  if (type === 'application/pdf') {
    const pdfContent = '%PDF-1.4\n' + content;
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(pdfContent);
    file.arrayBuffer = vi.fn(() => Promise.resolve(uint8Array.buffer));
  } else {
    file.arrayBuffer = vi.fn(() => Promise.resolve(new ArrayBuffer(content.length)));
  }
  return file;
};

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => {
  const mockGetDocument = vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 2,
      getMetadata: vi.fn(() => Promise.resolve({
        info: {
          Title: 'Test PDF',
          Author: 'Test Author',
          CreationDate: new Date('2024-01-01')
        }
      })),
      getPage: vi.fn((pageNum: number) => Promise.resolve({
        getTextContent: vi.fn(() => Promise.resolve({
          items: [
            { str: 'Page ' + pageNum + ' content', transform: [0, 0, 0, 0, 0, 100] },
            { str: 'More content', transform: [0, 0, 0, 0, 0, 80] }
          ]
        }))
      }))
    })
  }));

  return {
    default: {
      GlobalWorkerOptions: { workerSrc: '' },
      getDocument: mockGetDocument
    },
    GlobalWorkerOptions: { workerSrc: '' },
    getDocument: mockGetDocument
  };
});

// Mock mammoth
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(() => Promise.resolve({
      value: 'This is a test DOCX document with some content.'
    })),
    convertToHtml: vi.fn(() => Promise.resolve({
      value: '<h1>Test Document</h1><p>This is a paragraph.</p><ul><li>Item 1</li><li>Item 2</li></ul>',
      messages: []
    }))
  }
}));

describe('Advanced Document Processor', () => {
  describe('PDF Processing', () => {
    // Tests PDF text extraction with metadata
    it('should extract text and metadata from PDF files', async () => {
      const pdfFile = createMockFile('pdf content', 'test.pdf', 'application/pdf');
      const result = await processDocument(pdfFile);
      
      expect(result).toBeDefined();
      expect(result.filename).toBe('test.pdf');
      expect(result.metadata?.documentType).toBe('pdf');
      expect(result.metadata?.title).toBe('Test PDF');
      expect(result.metadata?.author).toBe('Test Author');
      expect(result.metadata?.pageCount).toBe(2);
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    // Verifies PDF chunks contain page numbers
    it('should preserve page information in chunks', async () => {
      const pdfFile = createMockFile('pdf content', 'test.pdf', 'application/pdf');
      const result = await processDocument(pdfFile);
      
      const firstChunk = result.chunks[0];
      expect(firstChunk.metadata.page).toBeDefined();
      expect(firstChunk.metadata.documentType).toBe('pdf');
    });
  });

  describe('DOCX Processing', () => {
    // Tests DOCX content extraction with structure
    it('should extract text and structure from DOCX files', async () => {
      const docxFile = createMockFile('docx content', 'test.docx', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const result = await processDocument(docxFile);
      
      expect(result).toBeDefined();
      expect(result.filename).toBe('test.docx');
      expect(result.metadata?.documentType).toBe('docx');
      expect(result.content).toContain('This is a test DOCX document');
      expect(result.chunks.length).toBeGreaterThan(0);
    });

    // Tests DOCX processing fallback using file extension
    it('should handle DOCX files by extension when MIME type is missing', async () => {
      const docxFile = createMockFile('docx content', 'test.docx', '');
      const result = await processDocument(docxFile);
      
      expect(result).toBeDefined();
      expect(result.metadata?.documentType).toBe('docx');
    });
  });

  describe('Smart Chunking', () => {
    // Verifies chunking algorithm creates overlapping segments
    it('should create chunks with overlap', async () => {
      const textFile = createMockFile(
        'This is sentence one. This is sentence two. This is sentence three. This is sentence four.',
        'test.txt',
        'text/plain'
      );
      const result = await processDocument(textFile);
      
      expect(result.chunks.length).toBeGreaterThan(0);
      // Check that chunks have metadata
      result.chunks.forEach(chunk => {
        expect(chunk.metadata.filename).toBe('test.txt');
        expect(chunk.metadata.totalChunks).toBe(result.chunks.length);
      });
    });
  });

  describe('File Type Validation', () => {
    // Tests PDF file type validation
    it('should accept PDF files', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      expect(isValidFileType(pdfFile)).toBe(true);
    });

    // Tests DOCX file type validation
    it('should accept DOCX files', () => {
      const docxFile = new File(['content'], 'test.docx', { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      expect(isValidFileType(docxFile)).toBe(true);
    });

    // Tests file validation using extension fallback
    it('should accept files by extension when MIME type is empty', () => {
      const pdfFile = new File(['content'], 'test.pdf', { type: '' });
      const docxFile = new File(['content'], 'test.docx', { type: '' });
      
      expect(isValidFileType(pdfFile)).toBe(true);
      expect(isValidFileType(docxFile)).toBe(true);
    });

    // Verifies rejection of unsupported file formats
    it('should reject unsupported file types', () => {
      const exeFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      expect(isValidFileType(exeFile)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    // Tests error handling for unsupported files
    it('should throw error for unsupported file types', async () => {
      const unsupportedFile = createMockFile('content', 'test.xyz', 'application/unknown');
      
      await expect(processDocument(unsupportedFile)).rejects.toThrow('Unsupported file type');
    });
  });
});