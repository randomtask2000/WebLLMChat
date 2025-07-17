import { writable } from 'svelte/store';
import type { Document, DocumentChunk } from '../types';

export const documents = writable<Document[]>([]);
export const isProcessingDocument = writable(false);

export function addDocument(doc: Document) {
  documents.update((docs) => {
    const updated = [...docs, doc];
    localStorage.setItem('rag-documents', JSON.stringify(updated));
    return updated;
  });
}

export function removeDocument(docId: string) {
  documents.update((docs) => {
    const updated = docs.filter((d) => d.id !== docId);
    localStorage.setItem('rag-documents', JSON.stringify(updated));
    return updated;
  });
}

export function updateDocument(docId: string, updates: Partial<Document>) {
  documents.update((docs) => {
    const updated = docs.map((d) => (d.id === docId ? { ...d, ...updates } : d));
    localStorage.setItem('rag-documents', JSON.stringify(updated));
    return updated;
  });
}

export function loadDocuments() {
  const stored = localStorage.getItem('rag-documents');
  if (stored) {
    documents.set(JSON.parse(stored));
  }
}

export function searchDocuments(query: string): Promise<DocumentChunk[]> {
  return new Promise((resolve) => {
    documents.subscribe((docs) => {
      const allChunks: DocumentChunk[] = [];

      docs.forEach((doc) => {
        doc.chunks.forEach((chunk) => {
          const score = calculateSimilarity(query.toLowerCase(), chunk.content.toLowerCase());
          if (score > 0.1) {
            allChunks.push({
              ...chunk,
              metadata: {
                ...chunk.metadata,
                score
              }
            });
          }
        });
      });

      allChunks.sort((a, b) => (b.metadata.score || 0) - (a.metadata.score || 0));
      resolve(allChunks.slice(0, 5));
    })();
  });
}

function calculateSimilarity(query: string, text: string): number {
  const queryWords = query.split(' ');
  const textWords = text.split(' ');

  let matches = 0;
  queryWords.forEach((word) => {
    if (textWords.some((textWord) => textWord.includes(word) || word.includes(textWord))) {
      matches++;
    }
  });

  return matches / queryWords.length;
}
