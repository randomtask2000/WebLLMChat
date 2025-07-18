<script lang="ts">
  import {
    chatHistories,
    currentChatId,
    newChat,
    loadChatHistory,
    deleteChatHistory
  } from '$lib/stores/chat';
  import { isModelLoaded, currentModel, availableModels } from '$lib/stores/models';
  import { formatTokenCount } from '$lib/utils/tokenCount';

  let fileInput: HTMLInputElement;

  function handleNewChat() {
    newChat();
  }

  function handleClearChat() {
    newChat(); // This effectively clears the current chat
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

  function handleExportChat() {
    try {
      const exportData = {
        chatHistories: $chatHistories,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `webllm-chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting chat history:', error);
      alert('Failed to export chat history. Please try again.');
    }
  }

  function handleImportClick() {
    fileInput.click();
  }

  function handleImportChat(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const importData = JSON.parse(jsonString);

        if (!importData.chatHistories || !Array.isArray(importData.chatHistories)) {
          throw new Error('Invalid chat history file format');
        }

        // Import the chat histories
        importData.chatHistories.forEach((chat: any) => {
          // Add imported chat to store if it doesn't already exist
          const existingChat = $chatHistories.find((h) => h.id === chat.id);
          if (!existingChat) {
            chatHistories.update((histories) => [...histories, chat]);
          }
        });

        alert(`Successfully imported ${importData.chatHistories.length} chat histories!`);
      } catch (error) {
        console.error('Error importing chat history:', error);
        alert('Failed to import chat history. Please check the file format and try again.');
      }
    };

    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    target.value = '';
  }

  $: currentModelInfo = $availableModels.find((m) => m.model_id === $currentModel);
</script>

<div class="h-full w-80 relative theme-text">
  <!-- Main content area with scrollable history -->
  <div class="absolute inset-0 flex flex-col">
    <!-- Header section -->
    <div class="p-4 pb-0">
      <div class="flex space-x-2 mb-4">
        <button class="btn variant-filled-primary flex-1" on:click={handleNewChat}>
          <i class="fa fa-plus mr-2"></i>
          New Chat
        </button>
        <button
          class="btn variant-outline-primary"
          on:click={handleClearChat}
          title="Clear current chat"
          aria-label="Clear current chat"
        >
          <i class="fa fa-broom"></i>
        </button>
      </div>

      <div class="mb-4 p-3 bg-surface-200-700-token rounded-lg" data-testid="model-status">
        <div class="text-sm text-surface-600-300-token mb-1">Current Model:</div>
        <div class="text-sm font-medium">{$currentModel}</div>
        {#if currentModelInfo?.description}
          <div class="text-xs text-surface-600-300-token mt-1">{currentModelInfo.description}</div>
        {/if}
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-center">
            <div
              class="w-2 h-2 rounded-full mr-2 {$isModelLoaded
                ? 'bg-success-500'
                : 'bg-warning-500'}"
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
    </div>

    <!-- Scrollable chat history -->
    <div class="flex-1 overflow-y-auto px-4" style="padding-bottom: 4rem;">
      <h3 class="h6 mb-3">Chat History</h3>

      {#if $chatHistories.length === 0}
        <p class="text-sm text-surface-600-300-token">No chat history yet</p>
      {:else}
        <div class="space-y-2">
          {#each $chatHistories as chat (chat.id)}
            <div
              class="p-3 rounded-lg cursor-pointer transition-colors flex items-start justify-between {$currentChatId ===
              chat.id
                ? 'bg-primary-500 text-white'
                : 'bg-surface-200-700-token hover:bg-surface-300-600-token'}"
              on:click={() => handleLoadChat(chat.id)}
              role="button"
              tabindex="0"
              on:keydown={(e) => e.key === 'Enter' && handleLoadChat(chat.id)}
            >
              <div class="flex-1 min-w-0">
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
                  {:else}
                    <div class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">No tokens</div>
                  {/if}
                </div>
              </div>
              <button
                class="btn btn-sm variant-ghost-surface ml-2 opacity-75 hover:opacity-100 flex-shrink-0"
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

  <!-- Fixed button bar at bottom -->
  <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-500/20 to-secondary-500/20 backdrop-blur-sm border-t border-surface-300-600-token p-3 z-50">
    <div class="flex space-x-2">
      <button
        class="btn variant-outline-surface flex-1 text-sm"
        on:click={handleExportChat}
        disabled={$chatHistories.length === 0}
      >
        <i class="fa fa-download mr-2"></i>
        Export
      </button>

      <button class="btn variant-outline-surface flex-1 text-sm" on:click={handleImportClick}>
        <i class="fa fa-upload mr-2"></i>
        Import
      </button>
    </div>
  </div>

  <!-- Hidden file input for import -->
  <input
    bind:this={fileInput}
    type="file"
    accept=".json"
    on:change={handleImportChat}
    style="display: none;"
  />
</div>
