<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { featureManager } from '$lib/config/features';

  export let disabled = false;
  export let acceptedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  export let className = '';
  export let showOverlay = true;

  const dispatch = createEventDispatcher<{
    files: FileList;
    error: string;
  }>();

  let isDragOver = false;
  let dragCounter = 0;

  function handleDragEnter(e: DragEvent) {
    if (disabled || !featureManager.isEnabled('dragDropUpload')) return;

    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    isDragOver = true;
  }

  function handleDragLeave(e: DragEvent) {
    if (disabled || !featureManager.isEnabled('dragDropUpload')) return;

    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
      isDragOver = false;
    }
  }

  function handleDragOver(e: DragEvent) {
    if (disabled || !featureManager.isEnabled('dragDropUpload')) return;

    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    if (disabled || !featureManager.isEnabled('dragDropUpload')) return;

    e.preventDefault();
    e.stopPropagation();
    isDragOver = false;
    dragCounter = 0;

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Validate file types
    const invalidFiles = Array.from(files).filter(
      (file) =>
        !acceptedTypes.some(
          (type) =>
            file.type === type ||
            file.name.endsWith(type.replace('application/', '.').replace('text/', '.'))
        )
    );

    if (invalidFiles.length > 0) {
      dispatch('error', `Unsupported file types: ${invalidFiles.map((f) => f.name).join(', ')}`);
      return;
    }

    dispatch('files', files);
  }
</script>

<div
  class="drag-drop-zone {className}"
  class:drag-over={isDragOver}
  class:disabled
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover={handleDragOver}
  on:drop={handleDrop}
  role="button"
  tabindex="0"
>
  <slot />

  {#if showOverlay && isDragOver && featureManager.isEnabled('dragDropUpload')}
    <div class="drag-overlay">
      <div class="drag-overlay-content">
        <i class="fa fa-upload text-3xl mb-2"></i>
        <p class="text-lg font-medium">Drop documents here</p>
        <p class="text-sm opacity-75">PDF, TXT, MD, DOCX files supported</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .drag-drop-zone {
    position: relative;
    transition: all 0.2s ease-in-out;
  }

  .drag-drop-zone.drag-over {
    background-color: rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
  }

  .drag-drop-zone.disabled {
    pointer-events: none;
    opacity: 0.6;
  }

  .drag-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(59, 130, 246, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    border-radius: inherit;
  }

  .drag-overlay-content {
    text-align: center;
    color: white;
    pointer-events: none;
  }
</style>
