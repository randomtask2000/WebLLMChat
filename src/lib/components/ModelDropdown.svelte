<script lang="ts">
  import { currentModel, availableModels, isModelLoaded, modelLoadingProgress } from '$lib/stores/models';
  import { loadModelWithChatBubble } from '$lib/utils/model-loading';
  import type { ModelInfo } from '$lib/types';

  let isDropdownOpen = false;

  function formatMemory(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)}GB`;
    }
    return `${mb}MB`;
  }

  function formatContext(tokens: number): string {
    if (tokens >= 1024) {
      return `${(tokens / 1024).toFixed(0)}k`;
    }
    return `${tokens}`;
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

<div class="relative model-dropdown" class:border-2={isDropdownOpen} class:border-red-500={isDropdownOpen}>
  <button 
    class="btn btn-sm variant-ghost-surface flex items-center space-x-2"
    on:click={() => {
      console.log('Button click event fired');
      toggleDropdown();
    }}
    aria-expanded={isDropdownOpen}
  >
    <i class="fa fa-microchip"></i>
    <span class="hidden sm:inline">Models {isDropdownOpen ? '🔽' : '▶️'}</span>
    <i class="fa fa-chevron-down text-xs {isDropdownOpen ? 'rotate-180' : ''} transition-transform duration-200"></i>
  </button>

  {#if isDropdownOpen}
    <div class="absolute top-full right-0 mt-2 w-[28rem] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-[9999] max-h-[32rem] overflow-y-auto">
      <div class="p-4 border-b border-gray-200 dark:border-gray-600">
        <h3 class="font-semibold text-lg text-gray-900 dark:text-white">Select LLM Model</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">Choose from {$availableModels.length} available models</p>
      </div>
      
      <!-- Fast/Lightweight Models -->
      <div class="border-b border-gray-200 dark:border-gray-600">
        <div class="p-3 bg-gray-50 dark:bg-gray-700">
          <h4 class="font-medium text-sm text-gray-800 dark:text-gray-200 flex items-center">
            <i class="fa fa-bolt text-yellow-500 mr-2"></i>
            ⚡ Fast & Lightweight Models
          </h4>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">Quick loading, minimal resource usage</p>
        </div>
        <div class="p-2 space-y-1">
          {#each $availableModels.filter(m => m.low_resource_required) as model (model.model_id)}
            <button
              class="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group text-gray-900 dark:text-white"
              class:bg-primary-500={$currentModel === model.model_id}
              class:text-white={$currentModel === model.model_id}
              on:click={() => selectModel(model.model_id)}
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <span class="font-medium text-sm truncate">
                    {model.model_id.replace('-q4f16_1-MLC', '').replace('-MLC', '').replace('-hf', '')}
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
                  {/if}
                </div>
                
                <div class="flex items-center space-x-1 text-xs opacity-75 flex-shrink-0">
                  <span class="bg-success-500 text-white px-2 py-1 rounded text-xs">Fast</span>
                  <span class="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                    {formatMemory(model.vram_required_MB)}
                  </span>
                  <span class="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                    {formatContext(model.context_length)}ctx
                  </span>
                </div>
              </div>
              
              <p class="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 mb-2 leading-relaxed">
                {model.description || 'No description available'}
              </p>
            </button>
          {/each}
        </div>
      </div>

      <!-- General Purpose Models -->
      <div class="border-b border-gray-200 dark:border-gray-600">
        <div class="p-3 bg-gray-50 dark:bg-gray-700">
          <h4 class="font-medium text-sm text-gray-800 dark:text-gray-200 flex items-center">
            <i class="fa fa-comments text-blue-500 mr-2"></i>
            💬 General Purpose Models
          </h4>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">Best for conversations and general tasks</p>
        </div>
        <div class="p-2 space-y-1">
          {#each $availableModels.filter(m => !m.low_resource_required && !m.model_id.includes('Code') && !m.model_id.includes('Math') && !m.model_id.includes('Abel')) as model (model.model_id)}
            <button
              class="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group text-gray-900 dark:text-white"
              class:bg-primary-500={$currentModel === model.model_id}
              class:text-white={$currentModel === model.model_id}
              on:click={() => selectModel(model.model_id)}
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                  <span class="font-medium text-sm truncate">
                    {model.model_id.replace('-q4f16_1-MLC', '').replace('-MLC', '').replace('-hf', '')}
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
                  {/if}
                </div>
                
                <div class="flex items-center space-x-1 text-xs opacity-75 flex-shrink-0">
                  {#if model.context_length > 500000}
                    <span class="bg-purple-500 text-white px-2 py-1 rounded text-xs">1M Context</span>
                  {:else if model.context_length > 100000}
                    <span class="bg-secondary-500 text-white px-2 py-1 rounded text-xs">Extended</span>
                  {/if}
                  <span class="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                    {formatMemory(model.vram_required_MB)}
                  </span>
                  <span class="bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded text-xs">
                    {formatContext(model.context_length)}ctx
                  </span>
                </div>
              </div>
              
              <p class="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 mb-2 leading-relaxed">
                {model.description || 'No description available'}
              </p>
            </button>
          {/each}
        </div>
      </div>

      <!-- Specialized Models -->
      <div class="border-b border-gray-200 dark:border-gray-600">
        <div class="p-3 bg-gray-50 dark:bg-gray-700">
          <h4 class="font-medium text-sm text-gray-800 dark:text-gray-200 flex items-center">
            <i class="fa fa-code text-green-500 mr-2"></i>
            🛠️ Specialized Models
          </h4>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">Code generation, math, and specialized tasks</p>
        </div>
        <div class="p-2 space-y-1">
          {#each $availableModels.filter(m => m.model_id.includes('Code') || m.model_id.includes('Math') || m.model_id.includes('Abel')) as model (model.model_id)}
          <button
            class="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group text-gray-900 dark:text-white"
            class:bg-primary-500={$currentModel === model.model_id}
            class:text-white={$currentModel === model.model_id}
            on:click={() => selectModel(model.model_id)}
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <span class="font-medium text-sm truncate">
                  {model.model_id.replace('-q4f16_1-MLC', '').replace('-MLC', '').replace('-hf', '')}
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
            
            <p class="text-xs text-gray-600 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 mb-2 leading-relaxed">
              {model.description || 'No description available'}
            </p>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-1 text-xs">
                {#if model.low_resource_required}
                  <span class="bg-success-500 text-white px-2 py-0.5 rounded text-xs">Fast</span>
                {/if}
                {#if model.context_length > 500000}
                  <span class="bg-purple-500 text-white px-2 py-0.5 rounded text-xs">1M Context</span>
                {:else if model.context_length > 100000}
                  <span class="bg-secondary-500 text-white px-2 py-0.5 rounded text-xs">Extended</span>
                {/if}
                {#if model.model_id.includes('Code')}
                  <span class="bg-blue-500 text-white px-2 py-0.5 rounded text-xs">Code</span>
                {/if}
                {#if model.model_id.includes('Math') || model.model_id.includes('Abel')}
                  <span class="bg-green-500 text-white px-2 py-0.5 rounded text-xs">Math</span>
                {/if}
              </div>
              
              {#if $currentModel === model.model_id && !$isModelLoaded}
                <div class="text-xs text-warning-500 flex items-center space-x-1">
                  <i class="fa fa-download"></i>
                  <span>{$modelLoadingProgress}%</span>
                </div>
              {/if}
            </div>
          </button>
        {/each}
        </div>
      </div>
      
      <div class="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <p class="text-xs text-gray-600 dark:text-gray-300">
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