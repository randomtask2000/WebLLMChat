import type { Document, DocumentChunk } from '../types';

export async function processDocument(file: File): Promise<Document> {
  const content = await extractTextFromFile(file);
  const chunks = chunkText(content, file.name);

  return {
    id: crypto.randomUUID(),
    filename: file.name,
    content,
    chunks,
    uploadedAt: Date.now(),
    size: file.size
  };
}

async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;

  if (fileType.startsWith('text/')) {
    return await file.text();
  }

  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(file);
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n';
    }

    return text;
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error('Failed to process PDF file');
  }
}

function chunkText(text: string, filename: string, chunkSize: number = 1000): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: crypto.randomUUID(),
        content: currentChunk.trim(),
        metadata: {
          filename,
          page: Math.floor(chunkIndex / 10) + 1
        }
      });
      currentChunk = sentence.trim();
      chunkIndex++;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: crypto.randomUUID(),
      content: currentChunk.trim(),
      metadata: {
        filename,
        page: Math.floor(chunkIndex / 10) + 1
      }
    });
  }

  return chunks;
}

export function isValidFileType(file: File): boolean {
  const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf', 'text/csv'];

  return allowedTypes.includes(file.type);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
