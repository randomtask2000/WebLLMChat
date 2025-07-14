<script lang="ts">
  import { chatHistories, currentChatId, newChat, loadChatHistory, deleteChatHistory } from '$lib/stores/chat';
  import { isModelLoaded, currentModel, availableModels } from '$lib/stores/models';
  import { formatTokenCount } from '$lib/utils/tokenCount';

  function handleNewChat() {
    newChat();
  }

  function handleLoadChat(chatId: string) {
    loadChatHistory(chatId);
  }

  function handleDeleteChat(chatId: string) {
    deleteChatHistory(chatId);
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString();
  }
  
  $: currentModelInfo = $availableModels.find(m => m.model_id === $currentModel);
</script>

<div class="h-full w-80 bg-surface-100-800-token p-4 flex flex-col">
  <button 
    class="btn variant-filled-primary mb-4"
    on:click={handleNewChat}
  >
    <i class="fa fa-plus mr-2"></i>
    New Chat
  </button>

  <div class="mb-4 p-3 bg-surface-200-700-token rounded-lg" data-testid="model-status">
    <div class="text-sm text-surface-600-300-token mb-1">Current Model:</div>
    <div class="text-sm font-medium">{$currentModel}</div>
    {#if currentModelInfo?.description}
      <div class="text-xs text-surface-600-300-token mt-1">{currentModelInfo.description}</div>
    {/if}
    <div class="flex items-center justify-between mt-2">
      <div class="flex items-center">
        <div 
          class="w-2 h-2 rounded-full mr-2 {$isModelLoaded ? 'bg-success-500' : 'bg-warning-500'}"
        ></div>
        <span class="text-xs text-surface-600-300-token">
          {$isModelLoaded ? 'Ready' : 'Loading...'}
        </span>
      </div>
      {#if currentModelInfo?.context_length}
        <span class="text-xs text-surface-600-300-token">
          {(currentModelInfo.context_length / 1024).toFixed(0)}k ctx
        </span>
      {/if}
    </div>
  </div>

  <div class="flex-1 overflow-y-auto">
    <h3 class="h6 mb-3">Chat History</h3>
    
    {#if $chatHistories.length === 0}
      <p class="text-sm text-surface-600-300-token">No chat history yet</p>
    {:else}
      <div class="space-y-2">
        {#each $chatHistories as chat (chat.id)}
          <div 
            class="p-3 rounded-lg cursor-pointer transition-colors {
              $currentChatId === chat.id 
                ? 'bg-primary-500 text-white' 
                : 'bg-surface-200-700-token hover:bg-surface-300-600-token'
            }"
          >
            <div 
              class="flex-1"
              on:click={() => handleLoadChat(chat.id)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && handleLoadChat(chat.id)}
            >
              <div class="text-sm font-medium truncate mb-1">
                {chat.title}
              </div>
              <div class="flex justify-between items-center">
                <div class="text-xs opacity-75">
                  {formatDate(chat.createdAt)}
                </div>
                {#if chat.totalTokens}
                  <div class="text-xs bg-surface-300-600-token px-2 py-0.5 rounded font-medium">
                    {formatTokenCount(chat.totalTokens)}
                  </div>
                {/if}
              </div>
            </div>
            <button 
              class="btn btn-sm variant-ghost-surface ml-2 opacity-75 hover:opacity-100"
              on:click|stopPropagation={() => handleDeleteChat(chat.id)}
              aria-label="Delete chat"
            >
              <i class="fa fa-trash text-xs"></i>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>