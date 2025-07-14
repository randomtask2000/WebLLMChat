<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let disabled = false;
  
  const dispatch = createEventDispatcher<{
    upload: FileList;
  }>();
  
  let fileInput: HTMLInputElement;
  let dragOver = false;

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    if (disabled || !event.dataTransfer?.files) return;
    
    dispatch('upload', event.dataTransfer.files);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!disabled) {
      dragOver = true;
    }
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleFileSelect() {
    if (fileInput.files) {
      dispatch('upload', fileInput.files);
      fileInput.value = '';
    }
  }
</script>

<div
  class="upload-zone {dragOver ? 'drag-over' : ''} {disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
  on:drop={handleDrop}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:click={() => !disabled && fileInput.click()}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === 'Enter' && !disabled && fileInput.click()}
>
  <input
    bind:this={fileInput}
    type="file"
    multiple
    accept=".txt,.md,.pdf,.csv"
    class="hidden"
    on:change={handleFileSelect}
    {disabled}
  />
  
  <div class="text-center">
    <div class="text-4xl mb-2">📁</div>
    <h3 class="text-lg font-semibold mb-2">Upload Documents</h3>
    <p class="text-sm text-surface-600-300-token mb-4">
      Drag and drop files here, or click to browse
    </p>
    <p class="text-xs text-surface-600-300-token">
      Supported formats: PDF, TXT, MD, CSV
    </p>
  </div>
</div>