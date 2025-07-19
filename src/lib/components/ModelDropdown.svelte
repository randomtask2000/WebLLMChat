<script lang="ts">
  import {
    currentModel,
    availableModels,
    isModelLoaded,
    modelLoadingProgress,
    cachedModels,
    checkCachedModels
  } from '$lib/stores/models';
  import { loadModelWithChatBubble } from '$lib/utils/model-loading';
  import { isMobile, getMobileOptimizedModels, canHandleLargeModels } from '$lib/utils/mobile';
  import type { ModelInfo } from '$lib/types';

  let isDropdownOpen = false;
  let buttonRef: HTMLButtonElement;
  let dropdownPosition = { top: 0, left: 0 };

  // Filter models for mobile devices
  $: filteredModels = $availableModels.filter((model) => {
    if (!isMobile()) return true;

    // On mobile, prioritize smaller models
    const mobileOptimized = getMobileOptimizedModels();
    if (mobileOptimized.includes(model.model_id)) return true;

    // Allow larger models only if device can handle them
    if (model.vram_required_MB && model.vram_required_MB > 2000) {
      return canHandleLargeModels();
    }

    return true;
  });

  function formatMemory(mb: number | undefined): string {
    const safeMb = mb ?? 0;
    if (safeMb >= 1024) {
      return `${(safeMb / 1024).toFixed(1)}GB`;
    }
    return `${safeMb}MB`;
  }

  function formatContext(tokens: number | undefined): string {
    const safeTokens = tokens ?? 0;
    if (safeTokens >= 1024) {
      return `${(safeTokens / 1024).toFixed(0)}k`;
    }
    return `${safeTokens}`;
  }

  async function selectModel(modelId: string) {
    if (modelId === $currentModel) return;

    try {
      await loadModelWithChatBubble(modelId);
    } catch (error) {
      console.error('Failed to load model:', error);
    }
    isDropdownOpen = false;
  }

  function toggleDropdown() {
    console.log('Toggle dropdown clicked, current state:', isDropdownOpen);
    isDropdownOpen = !isDropdownOpen;
    console.log('New state:', isDropdownOpen);
    
    if (isDropdownOpen && buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      dropdownPosition = {
        top: rect.bottom + 8,
        left: rect.right - 448 // 28rem = 448px
      };
    }
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (!event.target) return;
    const target = event.target as Element;
    if (!target.closest('.model-dropdown')) {
      isDropdownOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div
  class="relative model-dropdown"
>
  <button
    bind:this={buttonRef}
    class="btn btn-sm variant-ghost-surface flex items-center space-x-2"
    on:click={() => {
      console.log('Button click event fired');
      toggleDropdown();
    }}
    aria-expanded={isDropdownOpen}
  >
    <i class="fa fa-microchip"></i>
    <span class="hidden sm:inline">Models {isDropdownOpen ? '🔽' : '▶️'}</span>
    <i
      class="fa fa-chevron-down text-xs {isDropdownOpen
        ? 'rotate-180'
        : ''} transition-transform duration-200"
    ></i>
  </button>

  {#if isDropdownOpen}
    <div
      class="fixed w-[28rem] bg-surface-100-800-token border border-surface-300-600-token rounded-lg shadow-xl max-h-[32rem] overflow-y-auto"
      style="z-index: 999999 !important; top: {dropdownPosition.top}px; left: {dropdownPosition.left}px;"
    >
      <div class="p-4 border-b border-surface-300-600-token">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-lg text-surface-700-200-token">Select LLM Model</h3>
            <p class="text-sm text-surface-700-200-token opacity-80">
              Choose from {$availableModels.length} available models
            </p>
          </div>
          <button
            class="btn btn-sm variant-ghost-surface"
            on:click={() => checkCachedModels()}
            title="Refresh cache status"
          >
            <i class="fa fa-refresh"></i>
          </button>
        </div>
      </div>

      <!-- Fast/Lightweight Models -->
      <div class="border-b border-surface-300-600-token">
        <div class="p-3 bg-surface-200-700-token">
          <h4 class="font-medium text-sm text-surface-700-200-token flex items-center">
            <i class="fa fa-bolt text-yellow-400 mr-2"></i>
            ⚡ Fast & Lightweight Models
          </h4>
          <p class="text-xs text-surface-700-200-token opacity-80 mt-1">
            Quick loading, minimal resource usage
          </p>
        </div>
        <div class="p-2 space-y-1">
          {#each $availableModels.filter((m) => m.low_resource_required) as model (model.model_id)}
            <button
              class="w-full p-3 text-left hover:bg-surface-200-700-token rounded-lg transition-colors group text-surface-700-200-token"
              class:bg-primary-500={$currentModel === model.model_id}
              on:click={() => selectModel(model.model_id)}
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <span class="font-medium text-sm truncate">
                    {model.model_id
                      .replace('-q4f16_1-MLC', '')
                      .replace('-MLC', '')
                      .replace('-hf', '')}
                  </span>
                  {#if $currentModel === model.model_id}
                    <div class="flex items-center space-x-1 flex-shrink-0">
                      {#if $isModelLoaded}
                        <i class="fa fa-check-circle text-green-400"></i>
                        <span class="text-xs text-green-400">Active</span>
                      {:else}
                        <i class="fa fa-spinner fa-spin text-yellow-400"></i>
                        <span class="text-xs text-yellow-400">{$modelLoadingProgress}%</span>
                      {/if}
                    </div>
                  {:else if $cachedModels.has(model.model_id)}
                    <div class="flex items-center space-x-1 flex-shrink-0">
                      <i class="fa fa-download text-blue-400"></i>
                      <span class="text-xs text-blue-400">Cached</span>
                    </div>
                  {/if}
                </div>

                <div class="flex items-center space-x-1 text-xs opacity-75 flex-shrink-0">
                  <span
                    class="bg-green-500/80 text-white px-2 py-1 rounded text-xs backdrop-blur-sm"
                    >Fast</span
                  >
                  <span
                    class="bg-surface-200-700-token text-surface-700-200-token px-2 py-1 rounded text-xs backdrop-blur-sm"
                  >
                    {formatMemory(model.vram_required_MB)}
                  </span>
                  <span
                    class="bg-surface-200-700-token text-surface-700-200-token px-2 py-1 rounded text-xs backdrop-blur-sm"
                  >
                    {formatContext(model.context_length)}ctx
                  </span>
                </div>
              </div>

              <p
                class="text-xs text-surface-700-200-token opacity-70 group-hover:opacity-90 mb-2 leading-relaxed"
              >
                {model.description || 'No description available'}
              </p>
            </button>
          {/each}
        </div>
      </div>

      <!-- General Purpose Models -->
      <div class="border-b border-surface-300-600-token">
        <div class="p-3 bg-surface-200-700-token">
          <h4 class="font-medium text-sm text-surface-700-200-token flex items-center">
            <i class="fa fa-comments text-blue-400 mr-2"></i>
            💬 General Purpose Models
          </h4>
          <p class="text-xs text-surface-700-200-token opacity-80 mt-1">
            Best for conversations and general tasks
          </p>
        </div>
        <div class="p-2 space-y-1">
          {#each $availableModels.filter((m) => !m.low_resource_required && !m.model_id.includes('Code') && !m.model_id.includes('Math') && !m.model_id.includes('Abel')) as model (model.model_id)}
            <button
              class="w-full p-3 text-left hover:bg-surface-200-700-token rounded-lg transition-colors group text-surface-700-200-token"
              class:bg-primary-500={$currentModel === model.model_id}
              on:click={() => selectModel(model.model_id)}
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <span class="font-medium text-sm truncate">
                    {model.model_id
                      .replace('-q4f16_1-MLC', '')
                      .replace('-MLC', '')
                      .replace('-hf', '')}
                  </span>
                  {#if $currentModel === model.model_id}
                    <div class="flex items-center space-x-1 flex-shrink-0">
                      {#if $isModelLoaded}
                        <i class="fa fa-check-circle text-green-400"></i>
                        <span class="text-xs text-green-400">Active</span>
                      {:else}
                        <i class="fa fa-spinner fa-spin text-yellow-400"></i>
                        <span class="text-xs text-yellow-400">{$modelLoadingProgress}%</span>
                      {/if}
                    </div>
                  {:else if $cachedModels.has(model.model_id)}
                    <div class="flex items-center space-x-1 flex-shrink-0">
                      <i class="fa fa-download text-blue-400"></i>
                      <span class="text-xs text-blue-400">Cached</span>
                    </div>
                  {/if}
                </div>

                <div class="flex items-center space-x-1 text-xs opacity-75 flex-shrink-0">
                  {#if (model.context_length ?? 0) > 500000}
                    <span
                      class="bg-purple-500/80 text-white px-2 py-1 rounded text-xs backdrop-blur-sm"
                      >1M Context</span
                    >
                  {:else if (model.context_length ?? 0) > 100000}
                    <span
                      class="bg-blue-500/80 text-white px-2 py-1 rounded text-xs backdrop-blur-sm"
                      >Extended</span
                    >
                  {/if}
                  <span
                    class="bg-surface-200-700-token text-surface-700-200-token px-2 py-1 rounded text-xs backdrop-blur-sm"
                  >
                    {formatMemory(model.vram_required_MB)}
                  </span>
                  <span
                    class="bg-surface-200-700-token text-surface-700-200-token px-2 py-1 rounded text-xs backdrop-blur-sm"
                  >
                    {formatContext(model.context_length)}ctx
                  </span>
                </div>
              </div>

              <p
                class="text-xs text-surface-700-200-token opacity-70 group-hover:opacity-90 mb-2 leading-relaxed"
              >
                {model.description || 'No description available'}
              </p>
            </button>
          {/each}
        </div>
      </div>

      <!-- Specialized Models -->
      <div class="border-b border-surface-300-600-token">
        <div class="p-3 bg-surface-200-700-token">
          <h4 class="font-medium text-sm text-surface-700-200-token flex items-center">
            <i class="fa fa-code text-green-400 mr-2"></i>
            🛠️ Specialized Models
          </h4>
          <p class="text-xs text-surface-700-200-token opacity-80 mt-1">
            Code generation, math, and specialized tasks
          </p>
        </div>
        <div class="p-2 space-y-1">
          {#each $availableModels.filter((m) => m.model_id.includes('Code') || m.model_id.includes('Math') || m.model_id.includes('Abel')) as model (model.model_id)}
            <button
              class="w-full p-3 text-left hover:bg-surface-200-700-token rounded-lg transition-colors group text-surface-700-200-token"
              class:bg-primary-500={$currentModel === model.model_id}
              on:click={() => selectModel(model.model_id)}
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <span class="font-medium text-sm truncate">
                    {model.model_id
                      .replace('-q4f16_1-MLC', '')
                      .replace('-MLC', '')
                      .replace('-hf', '')}
                  </span>
                  {#if $currentModel === model.model_id}
                    <div class="flex items-center space-x-1 flex-shrink-0">
                      {#if $isModelLoaded}
                        <i class="fa fa-check-circle text-success-500"></i>
                        <span class="text-xs text-success-500">Active</span>
                      {:else}
                        <i class="fa fa-spinner fa-spin text-warning-500"></i>
                        <span class="text-xs text-warning-500">{$modelLoadingProgress}%</span>
                      {/if}
                    </div>
                  {:else if $cachedModels.has(model.model_id)}
                    <div class="flex items-center space-x-1 flex-shrink-0">
                      <i class="fa fa-download text-blue-400"></i>
                      <span class="text-xs text-blue-400">Cached</span>
                    </div>
                  {/if}
                </div>

                <div class="flex items-center space-x-1 text-xs opacity-75 flex-shrink-0">
                  <span class="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                    {formatMemory(model.vram_required_MB)}
                  </span>
                  <span class="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                    {formatContext(model.context_length)}ctx
                  </span>
                </div>
              </div>

              <p
                class="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 mb-2 leading-relaxed"
              >
                {model.description || 'No description available'}
              </p>

              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1 text-xs">
                  {#if model.low_resource_required}
                    <span
                      class="bg-green-500/80 text-white px-2 py-0.5 rounded text-xs backdrop-blur-sm"
                      >Fast</span
                    >
                  {/if}
                  {#if (model.context_length ?? 0) > 500000}
                    <span
                      class="bg-purple-500/80 text-white px-2 py-0.5 rounded text-xs backdrop-blur-sm"
                      >1M Context</span
                    >
                  {:else if (model.context_length ?? 0) > 100000}
                    <span
                      class="bg-blue-500/80 text-white px-2 py-0.5 rounded text-xs backdrop-blur-sm"
                      >Extended</span
                    >
                  {/if}
                  {#if model.model_id.includes('Code')}
                    <span
                      class="bg-cyan-500/80 text-white px-2 py-0.5 rounded text-xs backdrop-blur-sm"
                      >Code</span
                    >
                  {/if}
                  {#if model.model_id.includes('Math') || model.model_id.includes('Abel')}
                    <span
                      class="bg-emerald-500/80 text-white px-2 py-0.5 rounded text-xs backdrop-blur-sm"
                      >Math</span
                    >
                  {/if}
                </div>

                {#if $currentModel === model.model_id && !$isModelLoaded}
                  <div class="text-xs text-yellow-400 flex items-center space-x-1">
                    <i class="fa fa-download"></i>
                    <span>{$modelLoadingProgress}%</span>
                  </div>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <div class="p-4 border-t border-surface-300-600-token bg-surface-200-700-token">
        <p class="text-xs text-surface-700-200-token opacity-70">
          💡 Tip: Smaller models load faster. Extended context models support longer conversations.
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .rotate-180 {
    transform: rotate(180deg);
  }
</style>
