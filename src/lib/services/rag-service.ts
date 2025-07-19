import type {
  RAGService,
  RAGDocument,
  RAGQueryResult,
  EmbeddingProvider,
  VectorStore
} from '$lib/types/rag';
import { featureManager, ragSettingsManager } from '$lib/config/features';
import { processDocument } from '$lib/utils/document-processor';

// Client-side implementation of RAG service for document search
export class ClientRAGService implements RAGService {
  private embeddingProvider: EmbeddingProvider | null = null;
  private vectorStore: VectorStore | null = null;
  private isInitialized = false;
  private lastReadyState: boolean | undefined;

  // Creates RAG service with optional providers
  // Initializes RAG service with optional providers
  constructor(embeddingProvider?: EmbeddingProvider, vectorStore?: VectorStore) {
    if (embeddingProvider) this.embeddingProvider = embeddingProvider;
    if (vectorStore) this.vectorStore = vectorStore;
  }

  // Initializes RAG service with required providers
  // Sets up embedding provider and vector store
  async initialize(embeddingProvider: EmbeddingProvider, vectorStore: VectorStore): Promise<void> {
    console.log('[RAGService] initialize called');
    console.log('[RAGService] clientSideRAG feature enabled:', featureManager.isEnabled('clientSideRAG'));
    
    if (!featureManager.isEnabled('clientSideRAG')) {
      throw new Error('Client-side RAG is not enabled');
    }

    console.log('[RAGService] Setting embedding provider:', embeddingProvider);
    this.embeddingProvider = embeddingProvider;
    
    console.log('[RAGService] Setting vector store:', vectorStore);
    this.vectorStore = vectorStore;
    
    this.isInitialized = true;
    console.log('[RAGService] Initialization complete. isInitialized:', this.isInitialized);
  }

  // Checks if service is ready for operations
  // Checks if service is ready for operations
  isReady(): boolean {
    const isInitialized = this.isInitialized;
    const featureEnabled = featureManager.isEnabled('clientSideRAG');
    const embeddingProviderReady = this.embeddingProvider?.isReady();
    const hasVectorStore = this.vectorStore !== null;
    
    const isReady = isInitialized && featureEnabled && embeddingProviderReady === true && hasVectorStore;
    
    // Only log when state changes to reduce spam
    if (this.lastReadyState !== isReady) {
      console.log('[RAGService] isReady state changed:', {
        isInitialized,
        featureEnabled,
        embeddingProviderReady,
        hasVectorStore,
        result: isReady
      });
      this.lastReadyState = isReady;
    }
    
    return isReady;
  }

  // Processes and adds document to RAG system
  // Processes and adds document to RAG system
  async addDocument(file: File): Promise<string> {
    if (!this.isReady()) {
      throw new Error('RAG service is not ready');
    }

    try {
      // Process the file
      const processedDoc = await processDocument(file);

      // Transform processedDoc chunks to RAG chunks
      const ragChunks: RAGChunk[] = processedDoc.chunks.map((chunk, index) => ({
        id: chunk.id,
        documentId: processedDoc.id,
        content: chunk.content,
        embedding: undefined,
        metadata: {
          fileName: file.name,
          chunkIndex: index,
          tokenCount: Math.ceil(chunk.content.length / 4),
          ...chunk.metadata // Include all metadata from document processor
        },
        createdAt: new Date()
      }));

      // Create document with chunks
      const document: RAGDocument = {
        id: processedDoc.id,
        fileName: file.name,
        content: processedDoc.content,
        chunks: ragChunks,
        metadata: {
          fileSize: file.size,
          fileType: file.type,
          processingStatus: 'completed',
          embeddingStatus: 'pending',
          totalChunks: ragChunks.length,
          totalTokens: Math.ceil(processedDoc.content.length / 4), // rough token estimate
          documentType: processedDoc.metadata?.documentType,
          documentTitle: processedDoc.metadata?.title,
          documentAuthor: processedDoc.metadata?.author,
          pageCount: processedDoc.metadata?.pageCount
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate we have chunks
      if (document.chunks.length === 0) {
        throw new Error(`Document processing failed: No chunks created for ${file.name}. The document may be empty or in an unsupported format.`);
      }

      // Calculate average chunk size
      if (document.chunks.length > 0) {
        const totalChars = document.chunks.reduce((sum, chunk) => sum + chunk.content.length, 0);
        document.metadata.avgChunkSize = Math.round(totalChars / document.chunks.length);
      }

      // Update embedding provider vocabulary
      if (this.embeddingProvider && 'updateVocabulary' in this.embeddingProvider) {
        (this.embeddingProvider as any).updateVocabulary(document.content);
      }

      // Generate embeddings if enabled
      if (featureManager.isEnabled('documentEmbeddings')) {
        document.metadata.embeddingStatus = 'processing';
        await this.generateEmbeddings(document);
        document.metadata.embeddingStatus = 'completed';
      }

      // Store in vector store
      await this.vectorStore!.addDocument(document);

      return document.id;
    } catch (error) {
      console.error('Error adding document to RAG:', error);
      throw error;
    }
  }

  // Removes document from RAG system
  // Removes document from vector store
  async removeDocument(documentId: string): Promise<void> {
    if (!this.isReady()) {
      throw new Error('RAG service is not ready');
    }

    await this.vectorStore!.removeDocument(documentId);
  }

  // Searches for relevant documents using semantic and keyword search
  // Searches documents using semantic and keyword search
  async search(query: string, topK = 3): Promise<RAGQueryResult> {
    if (!this.isReady()) {
      throw new Error('RAG service is not ready');
    }

    if (!featureManager.isEnabled('vectorSearch')) {
      return {
        query,
        results: [],
        contextUsed: '',
        tokensUsed: 0
      };
    }

    try {
      console.log('🔍 RAG: Generating embedding for query:', query);
      // Generate embedding for query
      const queryEmbedding = await this.embeddingProvider!.generateEmbedding(query);
      console.log('🔍 RAG: Query embedding generated, dimensions:', queryEmbedding.length);

      // Search vector store
      // Get accuracy setting and calculate similarity threshold
      const accuracy = ragSettingsManager.getSearchAccuracy();
      // Map accuracy from 0-100 to threshold from 0.1-0.9
      // Lower accuracy = lower threshold (more results), higher accuracy = higher threshold (fewer, better results)
      const similarityThreshold = 0.1 + (accuracy / 100) * 0.8;

      console.log(
        '🔍 RAG: Searching vector store with topK:',
        topK,
        'threshold:',
        similarityThreshold
      );
      let results = await this.vectorStore!.search(queryEmbedding, topK * 2, similarityThreshold);
      console.log('🔍 RAG: Vector store returned', results.length, 'results');

      if (results.length > 0) {
        console.log('🔍 RAG: Best result similarity:', results[0].similarity);
        console.log(
          '🔍 RAG: Best result content preview:',
          results[0].chunk.content.substring(0, 100)
        );
      }

      // Always run keyword search as well for better coverage
      console.log('🔍 RAG: Running keyword search to supplement results');
      const keywordResults = await this.keywordSearch(query, topK * 2, accuracy);

      // Combine results from both searches
      const combinedResults = [...results];
      const seenChunkIds = new Set(results.map((r) => r.chunk.id));

      // Add keyword results that aren't already in semantic results
      for (const kwResult of keywordResults) {
        if (!seenChunkIds.has(kwResult.chunk.id)) {
          combinedResults.push(kwResult);
          seenChunkIds.add(kwResult.chunk.id);
        }
      }

      // Sort combined results by similarity and take top K
      combinedResults.sort((a, b) => b.similarity - a.similarity);
      const finalResults = combinedResults.slice(0, topK);

      console.log(`🔍 RAG: Combined search found ${finalResults.length} unique results`);

      if (finalResults.length > 0) {
        results = finalResults;
      }

      // Build context with token limits
      const MAX_CONTEXT_TOKENS = 500; // Safe limit for context
      const contextChunks = [];
      let totalTokens = 0;

      for (const result of results) {
        const chunkTokens = Math.ceil(result.chunk.content.length / 4); // rough estimate
        if (totalTokens + chunkTokens > MAX_CONTEXT_TOKENS) {
          break;
        }
        contextChunks.push(result.chunk.content);
        totalTokens += chunkTokens;
      }

      const contextUsed = contextChunks.join('\n\n');

      return {
        query,
        results: results.slice(0, contextChunks.length), // Only return results we actually used
        contextUsed,
        tokensUsed: totalTokens
      };
    } catch (error) {
      console.error('Error searching RAG:', error);
      throw error;
    }
  }

  // Retrieves all documents from vector store
  // Retrieves all stored documents
  async getDocuments(): Promise<RAGDocument[]> {
    if (!this.isReady()) {
      return [];
    }

    return await this.vectorStore!.getAllDocuments();
  }

  // Splits document into semantic chunks with overlap
  // Splits document into overlapping chunks
  private async chunkDocument(document: RAGDocument): Promise<any[]> {
    const CHUNK_SIZE = ragSettingsManager.getChunkSize();
    const OVERLAP = ragSettingsManager.getOverlapSize();

    // Split on sentences and line breaks for more semantic chunks
    // This helps preserve metadata lines like "Credits: David Widger"
    const lines = document.content.split(/\n+/);
    const sentences = [];

    for (const line of lines) {
      if (line.trim().length === 0) continue;

      // Check if line contains metadata patterns (Credits:, Author:, etc.)
      if (line.match(/^(Credits?|Author|Title|Date|Source|Project):/i)) {
        sentences.push(line.trim());
      } else {
        // Split regular lines on sentence boundaries
        const lineSentences = line.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        sentences.push(...lineSentences);
      }
    }
    const chunks = [];
    let chunkIndex = 0;
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/);
      const sentenceTokens = sentenceWords.length;

      // If adding this sentence would exceed chunk size, save current chunk
      if (currentTokens > 0 && currentTokens + sentenceTokens > CHUNK_SIZE) {
        chunks.push({
          id: crypto.randomUUID(),
          documentId: document.id,
          content: currentChunk.trim(),
          embedding: undefined,
          metadata: {
            fileName: document.fileName,
            chunkIndex,
            tokenCount: currentTokens
          },
          createdAt: new Date()
        });

        // Start new chunk with overlap (take last part of previous chunk)
        const overlapWords = currentChunk.split(/\s+/).slice(-OVERLAP);
        currentChunk = overlapWords.join(' ') + ' ' + sentence.trim();
        currentTokens = overlapWords.length + sentenceTokens;
        chunkIndex++;
      } else {
        // Add sentence to current chunk
        currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
        currentTokens += sentenceTokens;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: crypto.randomUUID(),
        documentId: document.id,
        content: currentChunk.trim(),
        embedding: undefined,
        metadata: {
          fileName: document.fileName,
          chunkIndex,
          tokenCount: currentTokens
        },
        createdAt: new Date()
      });
    }

    console.log(`🔍 RAG: Created ${chunks.length} chunks from ${document.fileName}`);
    return chunks;
  }

  // Generates embeddings for all document chunks
  // Generates embeddings for all document chunks
  private async generateEmbeddings(document: RAGDocument): Promise<void> {
    if (!this.embeddingProvider) return;

    for (const chunk of document.chunks) {
      chunk.embedding = await this.embeddingProvider.generateEmbedding(chunk.content);
    }
  }

  // Performs keyword-based search on documents
  // Performs keyword-based search on documents
  private async keywordSearch(query: string, topK: number, accuracy: number): Promise<any[]> {
    const documents = await this.vectorStore!.getAllDocuments();
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 1);
    const results: any[] = [];

    // Also search for the full query as a phrase
    const fullQuery = query.toLowerCase();

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        const chunkText = chunk.content.toLowerCase();
        let score = 0;
        let matchedWords = 0;
        let hasExactMatch = false;

        // Check for exact phrase match first (highest priority)
        if (chunkText.includes(fullQuery)) {
          hasExactMatch = true;
          score += 10; // High score for exact matches
        }

        // Then check individual words
        for (const word of queryWords) {
          if (chunkText.includes(word)) {
            matchedWords++;

            // Use regex for case-insensitive word boundary matching
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            const matches = (chunkText.match(regex) || []).length;
            score += matches * 2; // Weight word matches

            // Also check for partial matches (like "Widger" in "David Widger")
            const partialRegex = new RegExp(word, 'gi');
            const partialMatches = (chunkText.match(partialRegex) || []).length;
            if (partialMatches > matches) {
              score += (partialMatches - matches) * 0.5; // Lower weight for partial matches
            }
          }
        }

        if (matchedWords > 0 || hasExactMatch) {
          // Boost score if all query words are found
          if (matchedWords === queryWords.length) {
            score *= 1.5;
          }

          // Normalize score by chunk length (shorter chunks with matches are more relevant)
          const normalizedScore = score / Math.log(chunk.content.length + 10);

          // Apply minimum score threshold based on accuracy
          // Higher accuracy = higher minimum score required
          const minScore = (accuracy / 100) * 0.5;

          if (normalizedScore >= minScore) {
            results.push({
              chunk,
              document: doc,
              similarity: normalizedScore
            });
          }
        }
      }
    }

    // Sort by score and return top results
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }
}

// Singleton instance
export const ragService = new ClientRAGService();
