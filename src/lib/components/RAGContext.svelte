<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { featureManager, ragSettingsManager } from '$lib/config/features';
  import { ragService } from '$lib/services/rag-service';
  import { createEmbeddingProvider } from '$lib/services/embedding-service';
  import { createVectorStore } from '$lib/services/vector-store';
  import type { RAGDocument, RAGQueryResult } from '$lib/types/rag';
  import DocumentBrowser from './DocumentBrowser.svelte';

  const dispatch = createEventDispatcher();

  export let isVisible = false;
  export let lastQuery: RAGQueryResult | null = null;
  export let forceRefresh = 0; // Counter to trigger refresh from parent

  let documents: RAGDocument[] = [];
  let isInitialized = false;
  let isInitializing = false;
  let initializationError: string | null = null;
  let chunkSize = ragSettingsManager.getChunkSize();
  let overlapSize = ragSettingsManager.getOverlapSize();
  let searchAccuracy = ragSettingsManager.getSearchAccuracy();
  let showSettings = false;
  let showFeatures = false;
  let documentBrowserCollapsed = false;

  onMount(async () => {
    console.log('[RAGContext] Component mounted');
    console.log('[RAGContext] clientSideRAG feature enabled:', featureManager.isEnabled('clientSideRAG'));
    if (featureManager.isEnabled('clientSideRAG')) {
      await initializeRAG();
    } else {
      console.log('[RAGContext] clientSideRAG feature is disabled, skipping initialization');
    }
  });

  async function initializeRAG() {
    if (isInitializing || isInitialized) {
      console.log('[RAGContext] Already initializing or initialized, skipping');
      return;
    }
    
    isInitializing = true;
    console.log('[RAGContext] Starting RAG initialization...');
    try {
      console.log('[RAGContext] Creating embedding provider (tfidf)...');
      const embeddingProvider = createEmbeddingProvider('tfidf');
      console.log('[RAGContext] Embedding provider created:', embeddingProvider);

      console.log('[RAGContext] Creating vector store (indexeddb)...');
      const vectorStore = createVectorStore('indexeddb');
      console.log('[RAGContext] Vector store created:', vectorStore);

      // Wait for vector store to be ready if it has the method
      if (vectorStore.waitForReady) {
        console.log('[RAGContext] Waiting for vector store to be ready...');
        await vectorStore.waitForReady();
        console.log('[RAGContext] Vector store is ready');
      } else {
        console.log('[RAGContext] Vector store does not have waitForReady method');
      }

      console.log('[RAGContext] Initializing RAG service...');
      await ragService.initialize(embeddingProvider, vectorStore);
      console.log('[RAGContext] RAG service initialized successfully');

      console.log('[RAGContext] Loading documents...');
      await loadDocuments();
      console.log('[RAGContext] Documents loaded');

      isInitialized = true;
      initializationError = null;
      console.log('[RAGContext] RAG initialization completed successfully. isInitialized:', isInitialized);
    } catch (error) {
      console.error('[RAGContext] Failed to initialize RAG:', error);
      console.error('[RAGContext] Error stack:', error.stack);
      initializationError = error instanceof Error ? error.message : 'Unknown error';
      console.log('[RAGContext] isInitialized:', isInitialized, 'initializationError:', initializationError);
    } finally {
      isInitializing = false;
    }
  }

  let isLoadingDocuments = false;

  async function loadDocuments() {
    if (isLoadingDocuments) {
      console.log('[RAGContext] Already loading documents, skipping');
      return;
    }
    
    console.log('[RAGContext] loadDocuments called, ragService.isReady():', ragService.isReady());
    if (ragService.isReady()) {
      isLoadingDocuments = true;
      try {
        documents = await ragService.getDocuments();
        console.log('[RAGContext] Documents loaded successfully:', documents.length, 'documents');
      } catch (error) {
        console.error('[RAGContext] Error loading documents:', error);
      } finally {
        isLoadingDocuments = false;
      }
    } else {
      console.log('[RAGContext] RAG service not ready, skipping document load');
    }
  }

  async function removeDocument(documentId: string) {
    try {
      await ragService.removeDocument(documentId);
      await loadDocuments();
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleChunkSizeChange() {
    ragSettingsManager.setChunkSize(chunkSize);
  }

  function handleOverlapSizeChange() {
    ragSettingsManager.setOverlapSize(overlapSize);
  }

  function handleSearchAccuracyChange() {
    ragSettingsManager.setSearchAccuracy(searchAccuracy);
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  function handleDocumentLoaded(event) {
    console.log('[RAGContext] handleDocumentLoaded called');
    // Document is already loaded in RAG system, just refresh the display
    debounceLoadDocuments();
  }

  function handleDocumentRemoved(event) {
    console.log('[RAGContext] handleDocumentRemoved called');
    // Document was removed, refresh the display
    debounceLoadDocuments();
  }

  let lastQueryId = '';
  let lastForceRefresh = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function debounceLoadDocuments() {
    console.log('[RAGContext] debounceLoadDocuments called');
    if (debounceTimer) {
      console.log('[RAGContext] Clearing existing debounce timer');
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      console.log('[RAGContext] Debounce timer triggered, calling loadDocuments');
      loadDocuments();
      debounceTimer = null;
    }, 100);
  }

  // Reactive statement to reload documents when feature is enabled
  let hasTriggeredInit = false;
  $: if (featureManager.isEnabled('clientSideRAG') && !isInitialized && !isInitializing && !hasTriggeredInit) {
    console.log('[RAGContext] Reactive: Feature enabled and not initialized, calling initializeRAG');
    hasTriggeredInit = true;
    initializeRAG().finally(() => {
      hasTriggeredInit = false;
    });
  }

  // Reactive statement to reload documents when lastQuery changes (with deduplication)
  $: if (lastQuery && isInitialized && lastQuery.query !== lastQueryId) {
    lastQueryId = lastQuery.query;
    debounceLoadDocuments();
  }

  // Reactive statement to refresh when forceRefresh counter changes (with deduplication)
  $: if (forceRefresh > 0 && isInitialized && forceRefresh !== lastForceRefresh) {
    lastForceRefresh = forceRefresh;
    debounceLoadDocuments();
  }

  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  // Periodically refresh documents when panel is visible (reduced frequency)
  $: {
    if (isVisible && isInitialized) {
      if (!refreshInterval) {
        console.log('[RAGContext] Starting document refresh interval (10s)');
        refreshInterval = setInterval(() => {
          console.log('[RAGContext] Interval refresh trigger');
          loadDocuments();
        }, 10000); // Reduced from 2s to 10s
      }
    } else {
      if (refreshInterval) {
        console.log('[RAGContext] Clearing document refresh interval');
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    }
  }
</script>

{#if featureManager.isEnabled('clientSideRAG') && isVisible}
  <!-- Debug: RAG Panel is rendering -->
  <div
    class="rag-context-panel bg-surface-100-800-token border-l border-surface-300-600-token p-4 w-80 flex flex-col"
  >
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">RAG Context</h3>
      <div class="flex items-center space-x-1">
        <button
          class="btn-icon btn-icon-sm variant-soft-primary"
          on:click={loadDocuments}
          aria-label="Refresh documents"
          title="Refresh document list"
        >
          <i class="fa fa-refresh"></i>
        </button>
        <button
          class="btn-icon btn-icon-sm variant-soft-surface"
          on:click={() => (isVisible = false)}
          aria-label="Close RAG panel"
        >
          <i class="fa fa-times"></i>
        </button>
      </div>
    </div>

    {#if !isInitialized}
      <div class="text-center py-4">
        {#if initializationError}
          <div class="text-red-500 mb-2">
            <i class="fa fa-exclamation-triangle"></i>
            Initialization failed
          </div>
          <p class="text-sm text-surface-600-300-token">{initializationError}</p>
          <button class="btn variant-soft-primary mt-2" on:click={initializeRAG}> Retry </button>
        {:else}
          <div class="animate-pulse">
            <i class="fa fa-spinner fa-spin text-xl mb-2"></i>
            <p class="text-sm">Initializing RAG...</p>
            <p class="text-xs text-surface-600-300-token mt-1">
              {#if isInitializing}
                Setting up vector store...
              {:else}
                Starting initialization...
              {/if}
            </p>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Scrollable content area -->
      <div class="overflow-y-auto">
        <!-- Documents Section -->
        <div class="mb-6">
          <h4 class="font-medium mb-2 flex items-center">
            <i class="fa fa-file-text mr-2"></i>
            Documents ({documents.length})
          </h4>

          {#if documents.length === 0}
            <p class="text-sm text-surface-600-300-token italic">
              No documents indexed yet. Drop files in the chat to get started.
            </p>
          {:else}
            <div class="space-y-2">
              {#each documents as doc}
                <div class="bg-surface-200-700-token rounded-lg p-3">
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-sm truncate" title={doc.fileName}>
                        {doc.fileName}
                      </p>
                      <p class="text-xs text-surface-600-300-token">
                        {formatFileSize(doc.metadata.fileSize)} • {doc.metadata.totalChunks} chunks
                        {#if doc.metadata.avgChunkSize}
                          • ~{doc.metadata.avgChunkSize} chars/chunk
                        {/if}
                      </p>
                    </div>
                    <button
                      class="btn-icon btn-icon-sm variant-soft-error ml-2"
                      on:click={() => removeDocument(doc.id)}
                      aria-label="Remove document"
                    >
                      <i class="fa fa-trash text-xs"></i>
                    </button>
                  </div>

                  <div class="flex items-center space-x-2 text-xs">
                    <span class="flex items-center {getStatusColor(doc.metadata.processingStatus)}">
                      <i class="fa fa-circle mr-1 text-xs"></i>
                      Processing: {doc.metadata.processingStatus}
                    </span>

                    {#if featureManager.isEnabled('documentEmbeddings')}
                      <span class="flex items-center {getStatusColor(doc.metadata.embeddingStatus)}">
                        <i class="fa fa-circle mr-1 text-xs"></i>
                        Embeddings: {doc.metadata.embeddingStatus}
                      </span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Last Query Results -->
        {#if lastQuery && featureManager.isEnabled('ragContextDisplay')}
          <div class="mb-4">
            <h4 class="font-medium mb-2 flex items-center">
              <i class="fa fa-search mr-2"></i>
              Last Query Results
            </h4>

            {#if lastQuery.results.length === 0}
              <p class="text-sm text-surface-600-300-token italic">
                No relevant documents found for the last query.
              </p>
            {:else}
              <div class="space-y-2">
                <div class="text-xs text-surface-600-300-token mb-2">
                  Found {lastQuery.results.length} relevant chunks ({Math.round(lastQuery.tokensUsed)}
                  tokens)
                </div>

                {#each lastQuery.results as result}
                  <div class="bg-surface-200-700-token rounded p-2">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-xs font-medium truncate">
                        {result.document.fileName}
                      </span>
                      <span class="text-xs text-surface-600-300-token">
                        {Math.round(result.similarity * 100)}% match
                      </span>
                    </div>
                    <p class="text-xs text-surface-600-300-token line-clamp-3">
                      {result.chunk.content.substring(0, 150)}...
                    </p>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- RAG Settings -->
        <div class="border-t border-surface-300-600-token pt-2 mb-2">
          <div class="flex items-center justify-between">
            <h4 class="font-medium text-sm">RAG Settings</h4>
            <button
              class="btn-icon btn-icon-sm variant-soft-primary"
              on:click={() => (showSettings = !showSettings)}
              aria-label="Toggle settings"
            >
              <i class="fa fa-{showSettings ? 'chevron-up' : 'chevron-down'}"></i>
            </button>
          </div>

          {#if showSettings}
            <div class="space-y-3 text-sm mt-2">
              <div>
                <label for="chunk-size" class="block text-xs text-surface-600-300-token mb-1">
                  Chunk Size: {chunkSize} tokens
                </label>
                <input
                  id="chunk-size"
                  type="range"
                  bind:value={chunkSize}
                  on:change={handleChunkSizeChange}
                  min="50"
                  max="1000"
                  step="50"
                  class="w-full"
                />
                <div class="flex justify-between text-xs text-surface-600-300-token">
                  <span>50</span>
                  <span>1000</span>
                </div>
              </div>

              <div>
                <label for="overlap-size" class="block text-xs text-surface-600-300-token mb-1">
                  Overlap Size: {overlapSize} tokens
                </label>
                <input
                  id="overlap-size"
                  type="range"
                  bind:value={overlapSize}
                  on:change={handleOverlapSizeChange}
                  min="0"
                  max="200"
                  step="10"
                  class="w-full"
                />
                <div class="flex justify-between text-xs text-surface-600-300-token">
                  <span>0</span>
                  <span>200</span>
                </div>
              </div>

              <div>
                <label for="search-accuracy" class="block text-xs text-surface-600-300-token mb-1">
                  Search Accuracy: {searchAccuracy}%
                </label>
                <input
                  id="search-accuracy"
                  type="range"
                  bind:value={searchAccuracy}
                  on:change={handleSearchAccuracyChange}
                  min="0"
                  max="100"
                  step="5"
                  class="w-full"
                />
                <div class="flex justify-between text-xs text-surface-600-300-token">
                  <span>Fuzzy</span>
                  <span>Exact</span>
                </div>
              </div>

              <div class="text-xs text-surface-600-300-token bg-surface-200-700-token p-2 rounded">
                <strong>Note:</strong> Changes will apply to new documents. Re-upload existing documents
                to use new settings.
              </div>
            </div>
          {/if}
        </div>

        <!-- Feature Toggles -->
        <div class="border-t border-surface-300-600-token pt-2">
          <div class="flex items-center justify-between">
            <h4 class="font-medium text-sm">Features</h4>
            <button
              class="btn-icon btn-icon-sm variant-soft-primary"
              on:click={() => (showFeatures = !showFeatures)}
              aria-label="Toggle features"
            >
              <i class="fa fa-{showFeatures ? 'chevron-up' : 'chevron-down'}"></i>
            </button>
          </div>

          {#if showFeatures}
            <div class="space-y-1 text-sm mt-2">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  checked={featureManager.isEnabled('vectorSearch')}
                  on:change={() => featureManager.toggle('vectorSearch')}
                  class="mr-2"
                />
                Vector Search
              </label>

              <label class="flex items-center">
                <input
                  type="checkbox"
                  checked={featureManager.isEnabled('documentEmbeddings')}
                  on:change={() => featureManager.toggle('documentEmbeddings')}
                  class="mr-2"
                />
                Document Embeddings
              </label>

              <label class="flex items-center">
                <input
                  type="checkbox"
                  checked={featureManager.isEnabled('ragContextDisplay')}
                  on:change={() => featureManager.toggle('ragContextDisplay')}
                  class="mr-2"
                />
                Show Context in UI
              </label>
            </div>
          {/if}
        </div>
      </div>

      <!-- Document Browser - now positioned to fill remaining space -->
      <div class="flex-1 min-h-0">
        <DocumentBrowser 
          {documents}
          bind:isCollapsed={documentBrowserCollapsed}
          on:documentLoaded={handleDocumentLoaded}
          on:documentRemoved={handleDocumentRemoved}
        />
      </div>
    {/if}
  </div>
{/if}

<style>
  .rag-context-panel {
    height: 100vh;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
