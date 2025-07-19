<script lang="ts">
  import { Modal, ProgressBar } from '@skeletonlabs/skeleton';
  import {
    availableModels,
    downloadProgress,
    currentModel,
    isModelLoaded,
    cachedModels
  } from '$lib/stores/models';
  import { loadModelWithChatBubble } from '$lib/utils/model-loading';

  export let show = false;

  async function handleModelSwitch(modelId: string) {
    if ($currentModel === modelId) return;

    // Close the modal first so user can see the chat bubbles
    show = false;

    // Load model with chat bubble feedback
    await loadModelWithChatBubble(modelId);
  }

  function formatMemorySize(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  function getModelProgress(modelId: string) {
    return $downloadProgress[modelId] || { progress: 0, downloading: false, downloaded: false };
  }
</script>

{#if show}
  <Modal bind:show>
    <div class="p-6">
      <h2 class="h3 mb-4">Model Manager</h2>

      <div class="space-y-4">
        {#each $availableModels as model}
          {@const progress = getModelProgress(model.model_id)}
          {@const isCurrentModel = $currentModel === model.model_id}

          <div class="card p-4 {isCurrentModel ? 'ring-2 ring-primary-500' : ''}">
            <div class="flex items-center justify-between mb-2">
              <div class="flex-1">
                <h4 class="font-semibold">{model.model_id}</h4>
                {#if model.description}
                  <p class="text-sm text-surface-700-200-token mb-1">{model.description}</p>
                {/if}
                <div class="flex items-center space-x-4 text-xs text-surface-600-300-token">
                  {#if model.vram_required_MB}
                    <span>Memory: {formatMemorySize(model.vram_required_MB)}</span>
                  {/if}
                  {#if model.context_length}
                    <span>Context: {(model.context_length / 1024).toFixed(0)}k tokens</span>
                  {/if}
                  {#if model.low_resource_required}
                    <span class="badge variant-filled-success">Fast Loading</span>
                  {/if}
                </div>
              </div>

              <div class="flex items-center space-x-2">
                {#if isCurrentModel && $isModelLoaded}
                  <span class="badge variant-filled-success">Active</span>
                {:else if progress.downloading}
                  <span class="badge variant-filled-warning">Downloading</span>
                {:else if progress.downloaded || $cachedModels.has(model.model_id)}
                  <span class="badge variant-filled-tertiary">
                    <i class="fa fa-download mr-1"></i> Cached
                  </span>
                  <button
                    class="btn btn-sm variant-filled-primary"
                    on:click={() => handleModelSwitch(model.model_id)}
                  >
                    Load
                  </button>
                {:else}
                  <button
                    class="btn btn-sm variant-filled-secondary"
                    on:click={() => handleModelSwitch(model.model_id)}
                  >
                    Download
                  </button>
                {/if}
              </div>
            </div>

            {#if progress.downloading || (progress.progress > 0 && progress.progress < 100)}
              <ProgressBar value={progress.progress} max={100} class="mb-2" />
              <p class="text-sm text-surface-600-300-token">
                {progress.progress.toFixed(1)}% complete
              </p>
            {/if}

            {#if progress.error}
              <p class="text-sm text-error-500 mt-2">
                Error: {progress.error}
              </p>
            {/if}
          </div>
        {/each}
      </div>

      <div class="flex justify-end mt-6">
        <button class="btn variant-ghost-surface" on:click={() => (show = false)}> Close </button>
      </div>
    </div>
  </Modal>
{/if}
