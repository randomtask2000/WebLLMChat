<script lang="ts">
  import { featureManager } from '$lib/config/features';
  import type { FeatureFlags } from '$lib/config/features';

  export let isVisible = false;

  let features: FeatureFlags = featureManager.getAll();

  function toggleFeature(featureName: keyof FeatureFlags) {
    featureManager.toggle(featureName);
    features = featureManager.getAll();
  }

  function enableAll() {
    const allEnabled: Partial<FeatureFlags> = {
      dragDropUpload: true,
      clientSideRAG: true,
      documentEmbeddings: true,
      vectorSearch: true,
      ragContextDisplay: true
    };
    featureManager.setAll(allEnabled);
    features = featureManager.getAll();
  }

  function disableAll() {
    const allDisabled: Partial<FeatureFlags> = {
      dragDropUpload: false,
      clientSideRAG: false,
      documentEmbeddings: false,
      vectorSearch: false,
      ragContextDisplay: false
    };
    featureManager.setAll(allDisabled);
    features = featureManager.getAll();
  }

  const featureDescriptions: Record<keyof FeatureFlags, string> = {
    dragDropUpload: 'Enable drag-and-drop file uploads in chat',
    clientSideRAG: 'Enable client-side RAG (Retrieval-Augmented Generation)',
    documentEmbeddings: 'Generate embeddings for uploaded documents',
    vectorSearch: 'Enable semantic search through document vectors',
    ragContextDisplay: 'Show RAG context and search results in UI'
  };
</script>

{#if isVisible}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-60"
    on:click={() => (isVisible = false)}
    on:keydown={(e) => e.key === 'Escape' && (isVisible = false)}
    role="presentation"
    tabindex="-1"
  >
    <div
      class="bg-surface-100-800-token rounded-lg p-6 max-w-md w-full mx-4"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-label="Experimental Features"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">Experimental Features</h3>
        <button
          class="btn-icon btn-icon-sm variant-soft-surface"
          on:click={() => (isVisible = false)}
          aria-label="Close"
        >
          <i class="fa fa-times"></i>
        </button>
      </div>

      <div class="space-y-3 mb-4">
        {#each Object.entries(featureDescriptions) as [key, description]}
          <label class="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={features[key as keyof FeatureFlags]}
              on:change={() => toggleFeature(key as keyof FeatureFlags)}
              class="mt-1"
            />
            <div class="flex-1">
              <div class="font-medium text-sm">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              </div>
              <div class="text-xs text-surface-600-300-token">
                {description}
              </div>
            </div>
          </label>
        {/each}
      </div>

      <div class="flex space-x-2">
        <button class="btn variant-soft-primary flex-1" on:click={enableAll}> Enable All </button>
        <button class="btn variant-soft-error flex-1" on:click={disableAll}> Disable All </button>
      </div>

      <div class="mt-4 p-3 bg-surface-200-700-token rounded text-xs">
        <strong>Note:</strong> These are experimental features. Some may require a page refresh to take
        effect. Features are stored in browser localStorage.
      </div>
    </div>
  </div>
{/if}
