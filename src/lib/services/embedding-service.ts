import type { EmbeddingProvider } from '$lib/types/rag';

// Simple TF-IDF based embedding for fallback
export class TFIDFEmbeddingProvider implements EmbeddingProvider {
  private vocabulary: Map<string, number> = new Map();
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments = 0;
  private dimensions = 512; // Fixed dimension size
  private isInitialized = false;

  constructor() {
    this.initializeVocabulary();
    // Start with at least 1 document to avoid division issues
    this.totalDocuments = 1;
  }

  private async initializeVocabulary() {
    // Pre-populate with common words to ensure consistent dimensions
    const commonWords = [
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'must',
      'shall',
      'this',
      'that',
      'these',
      'those',
      'it',
      'he',
      'she',
      'we',
      'you',
      'they',
      'what',
      'where',
      'when',
      'why',
      'how',
      'which',
      'who',
      'whom'
    ];

    commonWords.forEach((word, index) => {
      this.vocabulary.set(word, index);
      this.documentFrequency.set(word, 1);
    });

    this.isInitialized = true;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized) {
      await this.initializeVocabulary();
    }

    const words = this.tokenize(text);
    const termFrequency = this.calculateTermFrequency(words);
    const embedding = new Array(this.dimensions).fill(0);

    // Add new words to vocabulary if space allows
    for (const word of words) {
      if (!this.vocabulary.has(word) && this.vocabulary.size < this.dimensions) {
        this.vocabulary.set(word, this.vocabulary.size);
        this.documentFrequency.set(word, 1);
      }
    }

    // Generate TF-IDF based embedding
    for (const [term, tf] of termFrequency) {
      const vocabularyIndex = this.vocabulary.get(term);
      if (vocabularyIndex !== undefined && vocabularyIndex < this.dimensions) {
        const df = this.documentFrequency.get(term) || 1;
        const idf = Math.log((this.totalDocuments + 1) / (df + 1)) + 1; // Add smoothing
        const tfidf = tf * idf;
        embedding[vocabularyIndex] = tfidf;
      }
    }

    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  private tokenize(text: string): string[] {
    // First extract potential names (capitalized words) before lowercasing
    const capitalizedWords = text.match(/\b[A-Z][a-z]+\b/g) || [];

    // Standard tokenization
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 0);

    // Add original capitalized words back (for names like "Widger", "David")
    capitalizedWords.forEach((word) => {
      const lowerWord = word.toLowerCase();
      if (!tokens.includes(lowerWord)) {
        tokens.push(lowerWord);
      }
    });

    return tokens;
  }

  private calculateTermFrequency(words: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalWords = words.length;

    for (const word of words) {
      tf.set(word, (tf.get(word) || 0) + 1);
    }

    // Convert to relative frequency
    for (const [term, count] of tf) {
      tf.set(term, count / totalWords);
    }

    return tf;
  }

  // Update vocabulary with new document
  updateVocabulary(text: string): void {
    const words = this.tokenize(text);
    const uniqueWords = new Set(words);

    this.totalDocuments++;

    for (const word of uniqueWords) {
      if (!this.vocabulary.has(word) && this.vocabulary.size < this.dimensions) {
        this.vocabulary.set(word, this.vocabulary.size);
      }

      this.documentFrequency.set(word, (this.documentFrequency.get(word) || 0) + 1);
    }
  }
}

// WebLLM-based embedding provider (placeholder for when WebLLM supports embeddings)
export class WebLLMEmbeddingProvider implements EmbeddingProvider {
  private webllmService: any; // TODO: Type this properly when WebLLM embeddings are available
  private ready = false;

  constructor(webllmService: any) {
    this.webllmService = webllmService;
    this.initialize();
  }

  private async initialize() {
    // TODO: Initialize WebLLM embedding model when available
    // For now, this is a placeholder
    this.ready = false;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ready) {
      throw new Error('WebLLM embedding provider is not ready');
    }

    // TODO: Implement WebLLM embedding generation
    // This would call the WebLLM service to generate embeddings
    throw new Error('WebLLM embeddings not yet implemented');
  }

  getDimensions(): number {
    return 768; // Typical embedding dimension
  }

  isReady(): boolean {
    return this.ready;
  }
}

// Utility function to calculate cosine similarity
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Factory function to create appropriate embedding provider
export function createEmbeddingProvider(
  type: 'tfidf' | 'webllm' = 'tfidf',
  webllmService?: any
): EmbeddingProvider {
  switch (type) {
    case 'webllm':
      if (!webllmService) {
        throw new Error('WebLLM service is required for WebLLM embedding provider');
      }
      return new WebLLMEmbeddingProvider(webllmService);
    case 'tfidf':
    default:
      return new TFIDFEmbeddingProvider();
  }
}
