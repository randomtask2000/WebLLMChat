<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { ragService } from '$lib/services/rag-service';
  import { documentStorageService } from '$lib/services/document-storage';
  import type { RAGDocument } from '$lib/types/rag';
  import type { StoredDocument } from '$lib/services/document-storage';

  const dispatch = createEventDispatcher();

  export let documents: RAGDocument[] = [];
  export let isCollapsed = false;

  let selectedDocument: RAGDocument | null = null;
  let showDocumentPreview = false;
  let storedDocuments: StoredDocument[] = [];
  let isDragOver = false;
  let isProcessing = false;
  let dropZoneElement: HTMLElement;

  onMount(() => {
    loadStoredDocuments();
  });

  function loadStoredDocuments() {
    storedDocuments = documentStorageService.getAllDocuments();
  }

  // Drag and drop handlers
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer!.dropEffect = 'copy';
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Only hide drag state if we're actually leaving the drop zone
    const rect = dropZoneElement.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragOver = false;
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFilesDropped(Array.from(files));
    }
  }

  async function handleFilesDropped(files: File[]) {
    isProcessing = true;
    
    try {
      for (const file of files) {
        // Check file type
        if (!isValidFileType(file)) {
          console.warn(`Skipping unsupported file type: ${file.name}`);
          continue;
        }
        
        try {
          await documentStorageService.addDocument(file);
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
        }
      }
      
      // Refresh the document list
      loadStoredDocuments();
      
    } finally {
      isProcessing = false;
    }
  }

  function isValidFileType(file: File): boolean {
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv'];
    const validExtensions = ['.pdf', '.txt', '.md', '.markdown', '.csv', '.docx', '.doc'];
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  function getDocumentIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'fa-file-pdf-o';
      case 'docx':
      case 'doc':
        return 'fa-file-word-o';
      case 'txt':
        return 'fa-file-text-o';
      case 'md':
      case 'markdown':
        return 'fa-file-code-o';
      case 'csv':
        return 'fa-file-excel-o';
      default:
        return 'fa-file-o';
    }
  }

  function getDocumentTypeColor(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'text-red-500';
      case 'docx':
      case 'doc':
        return 'text-blue-500';
      case 'txt':
        return 'text-gray-500';
      case 'md':
      case 'markdown':
        return 'text-green-500';
      case 'csv':
        return 'text-orange-500';
      default:
        return 'text-surface-600-300-token';
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  function openDocumentPreview(document: StoredDocument) {
    selectedDocument = documentStorageService.toRAGDocument(document);
    showDocumentPreview = true;
  }

  function closeDocumentPreview() {
    showDocumentPreview = false;
    selectedDocument = null;
  }

  async function loadDocumentIntoRAG(document: StoredDocument) {
    try {
      let file: File;
      
      // For binary files with original data, reconstruct the original file
      if (document.originalFileData && (document.metadata.fileType === 'pdf' || document.metadata.fileType === 'docx')) {
        try {
          // Decode base64 back to binary
          const binaryString = atob(document.originalFileData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          file = new File([bytes], document.fileName, {
            type: getContentType(document.metadata.fileType),
            lastModified: document.updatedAt.getTime()
          });
        } catch (decodeError) {
          console.error('Failed to decode original file data:', decodeError);
          throw new Error('Unable to reconstruct original file - file may be corrupted in storage');
        }
      } else {
        // For text files, use the content directly
        const blob = new Blob([document.content], { type: 'text/plain' });
        file = new File([blob], document.fileName, { 
          type: getContentType(document.metadata.fileType),
          lastModified: document.updatedAt.getTime()
        });
      }
      
      await ragService.addDocument(file);
      dispatch('documentLoaded', { document: documentStorageService.toRAGDocument(document) });
    } catch (error) {
      console.error('Error loading document into RAG:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to load document into RAG context.';
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF')) {
          errorMessage = 'Unable to process PDF: The file appears to be corrupted or invalid.';
        } else if (error.message.includes('password') || error.message.includes('encrypted')) {
          errorMessage = 'Cannot process password-protected or encrypted documents.';
        } else if (error.message.includes('reconstruct original file')) {
          errorMessage = 'File data corrupted in storage - please re-upload the document.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      // TODO: Replace with proper toast/notification system
      alert(errorMessage);
    }
  }

  async function removeStoredDocument(document: StoredDocument) {
    try {
      documentStorageService.removeDocument(document.id);
      loadStoredDocuments(); // Refresh the list
    } catch (error) {
      console.error('Error removing document:', error);
    }
  }

  function getContentType(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'application/pdf';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc':
        return 'application/msword';
      case 'txt':
        return 'text/plain';
      case 'md':
      case 'markdown':
        return 'text/markdown';
      case 'csv':
        return 'text/csv';
      default:
        return 'text/plain';
    }
  }

  function getPreviewContent(document: RAGDocument): string {
    if (document.content.length <= 1000) {
      return document.content;
    }
    return document.content.substring(0, 1000) + '...';
  }
</script>

<!-- Document Browser Section -->
<div class="border-t border-surface-300-600-token pt-4">
  <div class="flex items-center justify-between mb-3">
    <h4 class="font-medium text-sm flex items-center">
      <i class="fa fa-folder-open mr-2"></i>
      Document Browser ({documents.length})
    </h4>
    <button
      class="btn-icon btn-icon-sm variant-soft-primary"
      on:click={() => (isCollapsed = !isCollapsed)}
      aria-label="Toggle document browser"
    >
      <i class="fa fa-{isCollapsed ? 'chevron-down' : 'chevron-up'}"></i>
    </button>
  </div>

  {#if !isCollapsed}
    <!-- Drop Zone -->
    <div 
      bind:this={dropZoneElement}
      class="relative border-2 border-dashed rounded-lg transition-colors duration-200 flex flex-col h-full {isDragOver ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-surface-300-600-token'}"
      role="region"
      aria-label="Document drop zone"
      on:dragover={handleDragOver}
      on:dragleave={handleDragLeave}
      on:drop={handleDrop}
    >
      <!-- Drag overlay -->
      {#if isDragOver}
        <div class="absolute inset-0 flex items-center justify-center bg-primary-50/90 dark:bg-primary-950/90 rounded-lg z-10">
          <div class="text-center">
            <i class="fa fa-upload text-3xl text-primary-500 mb-2"></i>
            <p class="text-primary-700 dark:text-primary-300 font-medium">Drop documents here to save</p>
            <p class="text-sm text-primary-600 dark:text-primary-400">Documents will be saved to browser storage</p>
          </div>
        </div>
      {/if}

      <!-- Processing overlay -->
      {#if isProcessing}
        <div class="absolute inset-0 flex items-center justify-center bg-surface-100/90 dark:bg-surface-800/90 rounded-lg z-10">
          <div class="text-center">
            <i class="fa fa-spinner fa-spin text-2xl text-primary-500 mb-2"></i>
            <p class="text-surface-700 dark:text-surface-300">Processing documents...</p>
          </div>
        </div>
      {/if}

      <!-- Content -->
      <div class="p-4 flex-1 overflow-y-auto">
        {#if storedDocuments.length === 0}
          <div class="text-center py-6">
            <i class="fa fa-folder-open text-2xl text-surface-500-400-token mb-2"></i>
            <p class="text-sm text-surface-600-300-token">
              No documents saved in browser storage
            </p>
            <p class="text-xs text-surface-500-400-token mt-1">
              Drag and drop documents here to save them
            </p>
          </div>
        {:else}
          <div class="grid grid-cols-2 gap-3">
            {#each storedDocuments as document (document.id)}
          <div class="bg-surface-200-700-token rounded-lg p-3 hover:bg-surface-300-600-token transition-colors">
            <!-- Document Icon and Info -->
            <div class="flex items-start space-x-2 mb-2">
              <i class="fa {getDocumentIcon(document.metadata.fileType)} text-lg {getDocumentTypeColor(document.metadata.fileType)} mt-1"></i>
              <div class="flex-1 min-w-0">
                <h5 class="text-sm font-medium truncate" title={document.fileName}>
                  {document.fileName}
                </h5>
                <p class="text-xs text-surface-600-300-token">
                  {formatFileSize(document.metadata.fileSize)}
                </p>
                <p class="text-xs text-surface-500-400-token">
                  {formatDate(document.createdAt)}
                </p>
              </div>
            </div>

            <!-- Document Stats -->
            <div class="mb-3 text-xs text-surface-600-300-token">
              <div class="flex justify-between">
                <span>{document.metadata.totalChunks} chunks</span>
                <span>{document.metadata.totalTokens} tokens</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col space-y-1">
              <button
                class="btn btn-sm variant-ghost-primary"
                on:click={() => openDocumentPreview(document)}
                title="Preview document"
              >
                <i class="fa fa-eye text-xs mr-1"></i>
                Preview
              </button>
              <button
                class="btn btn-sm variant-filled-primary"
                on:click={() => loadDocumentIntoRAG(document)}
                title="Load into RAG context"
              >
                <i class="fa fa-upload text-xs mr-1"></i>
                Load
              </button>
              <button
                class="btn btn-sm variant-soft-error"
                on:click={() => removeStoredDocument(document)}
                title="Remove document"
                aria-label="Remove document"
              >
                <i class="fa fa-trash text-xs mr-1"></i>
                Delete
              </button>
            </div>
          </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<!-- Document Preview Modal -->
{#if showDocumentPreview && selectedDocument}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
    <div class="bg-surface-100-800-token rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full flex flex-col">
      <!-- Modal Header -->
      <div class="p-4 border-b border-surface-300-600-token flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <i class="fa {getDocumentIcon(selectedDocument.metadata.fileType)} text-xl {getDocumentTypeColor(selectedDocument.metadata.fileType)}"></i>
          <div>
            <h3 class="font-semibold text-lg">{selectedDocument.fileName}</h3>
            <p class="text-sm text-surface-600-300-token">
              {formatFileSize(selectedDocument.metadata.fileSize)} • 
              {selectedDocument.metadata.totalChunks} chunks • 
              {selectedDocument.metadata.totalTokens} tokens
            </p>
          </div>
        </div>
        <button
          class="btn-icon btn-icon-sm variant-soft-surface"
          on:click={closeDocumentPreview}
          aria-label="Close preview"
        >
          <i class="fa fa-times"></i>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="flex-1 overflow-hidden flex flex-col">
        <!-- Document Info -->
        <div class="p-4 bg-surface-200-700-token border-b border-surface-300-600-token">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-surface-600-300-token">File Type:</span>
              <span class="ml-2 font-medium">{selectedDocument.metadata.fileType.toUpperCase()}</span>
            </div>
            <div>
              <span class="text-surface-600-300-token">Created:</span>
              <span class="ml-2 font-medium">{formatDate(selectedDocument.createdAt)}</span>
            </div>
            <div>
              <span class="text-surface-600-300-token">Processing:</span>
              <span class="ml-2 font-medium capitalize">{selectedDocument.metadata.processingStatus}</span>
            </div>
            <div>
              <span class="text-surface-600-300-token">Embeddings:</span>
              <span class="ml-2 font-medium capitalize">{selectedDocument.metadata.embeddingStatus}</span>
            </div>
          </div>
        </div>

        <!-- Document Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <h4 class="font-medium mb-2">Content Preview</h4>
          <div class="bg-surface-50-900-token rounded p-4 text-sm leading-relaxed whitespace-pre-wrap border max-h-80 overflow-y-auto">
            {getPreviewContent(selectedDocument)}
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="p-4 border-t border-surface-300-600-token flex space-x-2">
          <button
            class="btn variant-filled-primary"
            on:click={() => {
              loadDocumentIntoRAG(selectedDocument);
              closeDocumentPreview();
            }}
          >
            <i class="fa fa-upload mr-2"></i>
            Load into RAG Context
          </button>
          <button
            class="btn variant-soft-surface"
            on:click={closeDocumentPreview}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}