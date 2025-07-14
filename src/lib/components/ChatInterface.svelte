<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import { currentMessages, addMessage, updateLastMessage, isTyping, saveChatHistory } from '$lib/stores/chat';
  import { generateChatResponse, webLLMService } from '$lib/utils/webllm';
  import { loadModelWithChatBubble } from '$lib/utils/model-loading';
  import { searchDocuments } from '$lib/stores/documents';
  import { currentModel, isModelLoaded, modelLoadingProgress, modelLoadingStatus } from '$lib/stores/models';
  import ChatMessage from './ChatMessage.svelte';
  import type { ChatMessage as ChatMessageType } from '$lib/types';

  let chatContainer: HTMLElement;
  let messageInput = '';
  let isSubmitting = false;
  let mounted = false;

  onMount(async () => {
    mounted = true;
    
    // Only run on client side
    if (!browser) {
      console.log('Not in browser, skipping model loading');
      return;
    }
    
    try {
      console.log('ChatInterface onMount starting...');
      
      // Wait a bit for stores to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!$currentModel) {
        console.error('No current model set');
        return;
      }
      
      console.log('Loading model:', $currentModel);
      await loadModelWithChatBubble($currentModel, scrollToBottom);
      console.log('Model loading completed');
    } catch (error) {
      console.error('Error in ChatInterface onMount:', error);
      // Add a simple error message to chat
      addMessage({
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: '❌ Failed to initialize the AI model. Please refresh the page to try again.',
        timestamp: Date.now()
      });
    }
  });

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  async function handleSubmit() {
    if (!messageInput.trim() || isSubmitting) return;
    
    if (!$isModelLoaded) {
      const waitingMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '⏳ Please wait for the model to finish loading before sending messages.',
        timestamp: Date.now()
      };
      addMessage(waitingMessage);
      scrollToBottom();
      return;
    }

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageInput.trim(),
      timestamp: Date.now()
    };

    addMessage(userMessage);
    isSubmitting = true;
    isTyping.set(true);

    const originalInput = messageInput;
    messageInput = '';
    
    try {
      const relevantChunks = await searchDocuments(userMessage.content);
      
      let contextPrompt = userMessage.content;
      if (relevantChunks.length > 0) {
        const context = relevantChunks.map(chunk => 
          `[${chunk.metadata.filename}] ${chunk.content}`
        ).join('\n\n');
        
        contextPrompt = `Context from documents:\n${context}\n\nUser question: ${userMessage.content}`;
      }

      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        chunks: relevantChunks
      };

      addMessage(assistantMessage);

      const messages = [
        ...($currentMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))),
        { role: 'user', content: contextPrompt }
      ];

      await generateChatResponse(messages, (content) => {
        updateLastMessage(content, relevantChunks);
        scrollToBottom();
      });

      saveChatHistory();
    } catch (error) {
      console.error('Error generating response:', error);
      updateLastMessage('Sorry, I encountered an error while processing your request. Please try again.');
    } finally {
      isSubmitting = false;
      isTyping.set(false);
      scrollToBottom();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  $: {
    scrollToBottom();
  }
</script>

<div class="flex flex-col h-full">
  {#if !$isModelLoaded && $modelLoadingProgress < 100}
    <div class="p-4 bg-surface-100-800-token border-b border-surface-300-600-token">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Loading Model: {$currentModel}</span>
        <span class="text-sm text-surface-600-300-token">{$modelLoadingProgress}%</span>
      </div>
      <ProgressBar value={$modelLoadingProgress} max={100} class="mb-2" />
      <p class="text-xs text-surface-600-300-token">{$modelLoadingStatus}</p>
    </div>
  {/if}
  
  <div 
    bind:this={chatContainer}
    class="flex-1 overflow-y-auto p-4 space-y-4"
  >
    {#if $currentMessages.length === 0}
      <div class="text-center text-surface-600-300-token mt-8">
        <div class="text-6xl mb-4">💬</div>
        <h2 class="h3 mb-2">Welcome to Claude WebLLM Chat</h2>
        <p>Start a conversation by typing a message below.</p>
        {#if !$isModelLoaded}
          <p class="text-sm mt-2">Loading model... Please wait.</p>
        {/if}
      </div>
    {:else}
      {#each $currentMessages as message (message.id)}
        <ChatMessage {message} />
      {/each}
      
      {#if $isTyping}
        <div class="chat-message assistant">
          <div class="flex items-center space-x-2">
            <div class="animate-pulse">💭</div>
            <span>Thinking...</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <div class="border-t border-surface-300-600-token p-4">
    <div class="flex space-x-2">
      <textarea
        bind:value={messageInput}
        on:keydown={handleKeydown}
        placeholder={$isModelLoaded ? "Type your message..." : "Model loading... You can type but wait to send"}
        disabled={isSubmitting}
        class="textarea flex-1 resize-none"
        rows="2"
      ></textarea>
      
      <button
        on:click={handleSubmit}
        disabled={!messageInput.trim() || isSubmitting}
        class="btn variant-filled-primary self-end"
      >
        {#if isSubmitting}
          <i class="fa fa-spinner fa-spin mr-2"></i>
        {:else}
          <i class="fa fa-paper-plane mr-2"></i>
        {/if}
        Send
      </button>
    </div>
    
    {#if !$isModelLoaded && $modelLoadingProgress < 100}
      <div class="text-xs text-surface-600-300-token mt-2">
        Model is loading ({$modelLoadingProgress}%)... Messages will queue until ready.
      </div>
    {/if}
  </div>
</div>