<script lang="ts">
  import { Modal } from '@skeletonlabs/skeleton';
  import { documents, addDocument, removeDocument, isProcessingDocument } from '$lib/stores/documents';
  import { processDocument, isValidFileType, formatFileSize } from '$lib/utils/document-processor';
  import FileUpload from './FileUpload.svelte';

  export let show = false;

  async function handleFileUpload(files: FileList) {
    if (!files.length) return;

    isProcessingDocument.set(true);
    
    try {
      for (const file of Array.from(files)) {
        if (!isValidFileType(file)) {
          console.warn(`Unsupported file type: ${file.type}`);
          continue;
        }
        
        const document = await processDocument(file);
        addDocument(document);
      }
    } catch (error) {
      console.error('Error processing documents:', error);
    } finally {
      isProcessingDocument.set(false);
    }
  }

  function handleDeleteDocument(docId: string) {
    removeDocument(docId);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
</script>

{#if show}
  <Modal bind:show>
    <div class="p-6 max-w-4xl">
      <h2 class="h3 mb-4">Document Manager</h2>
      
      <div class="mb-6">
        <FileUpload 
          on:upload={(e) => handleFileUpload(e.detail)}
          disabled={$isProcessingDocument}
        />
        
        {#if $isProcessingDocument}
          <div class="flex items-center space-x-2 mt-2 text-sm text-surface-600-300-token">
            <i class="fa fa-spinner fa-spin"></i>
            <span>Processing documents...</span>
          </div>
        {/if}
      </div>
      
      <div class="space-y-4 max-h-96 overflow-y-auto">
        {#if $documents.length === 0}
          <div class="text-center text-surface-600-300-token py-8">
            <div class="text-4xl mb-2">📄</div>
            <p>No documents uploaded yet</p>
            <p class="text-sm">Upload PDF, text, or markdown files to enable RAG search</p>
          </div>
        {:else}
          {#each $documents as doc (doc.id)}
            <div class="card p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h4 class="font-semibold mb-1">{doc.filename}</h4>
                  <div class="text-sm text-surface-600-300-token space-y-1">
                    <p>Size: {formatFileSize(doc.size)}</p>
                    <p>Chunks: {doc.chunks.length}</p>
                    <p>Uploaded: {formatDate(doc.uploadedAt)}</p>
                  </div>
                </div>
                
                <button 
                  class="btn btn-sm variant-ghost-error"
                  on:click={() => handleDeleteDocument(doc.id)}
                  aria-label="Delete document"
                >
                  <i class="fa fa-trash"></i>
                </button>
              </div>
              
              <details class="mt-3">
                <summary class="text-sm cursor-pointer text-surface-600-300-token hover:text-surface-800-200-token">
                  Preview content
                </summary>
                <div class="mt-2 p-3 bg-surface-100-800-token rounded text-sm">
                  {doc.content.slice(0, 300)}...
                </div>
              </details>
            </div>
          {/each}
        {/if}
      </div>
      
      <div class="flex justify-end mt-6">
        <button class="btn variant-ghost-surface" on:click={() => show = false}>
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}