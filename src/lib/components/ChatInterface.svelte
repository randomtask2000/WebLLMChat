<script lang="ts">
  import { onMount, afterUpdate, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import { currentMessages, addMessage, updateLastMessage, startResponseTiming, isTyping, saveChatHistory, retryLastUserMessage } from '$lib/stores/chat';
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
  let shouldAutoScroll = true;
  let scrollTimeout: number;

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

  // Auto-scroll functions
  function scrollToBottom(smooth = true) {
    if (!chatContainer) return;
    
    if (smooth) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function isNearBottom() {
    if (!chatContainer) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainer;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  }

  function handleScroll() {
    shouldAutoScroll = isNearBottom();
  }

  function throttledScrollToBottom() {
    if (!shouldAutoScroll) return;
    
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
      scrollToBottom();
    }, 50); // Throttle to every 50ms for smooth streaming
  }

  // Auto-scroll when messages change
  afterUpdate(async () => {
    if (shouldAutoScroll) {
      await tick();
      scrollToBottom();
    }
  });

  // Reactive auto-scroll for message updates
  $: if ($currentMessages.length > 0 && shouldAutoScroll) {
    tick().then(() => scrollToBottom());
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
    
    // Ensure we auto-scroll for new user messages
    shouldAutoScroll = true;
    await tick();
    scrollToBottom();
    
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
      
      // Start timing the response
      startResponseTiming();

      const messages = [
        ...($currentMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))),
        { role: 'user', content: contextPrompt }
      ];

      await generateChatResponse(messages, (content, isComplete = false) => {
        updateLastMessage(content, relevantChunks, isComplete);
        throttledScrollToBottom();
      });

      saveChatHistory();
      
      // Final scroll to ensure we're at the bottom
      await tick();
      scrollToBottom();
    } catch (error) {
      console.error('Error generating response:', error);
      updateLastMessage('Sorry, I encountered an error while processing your request. Please try again.', undefined, true);
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

  async function handleRetry(content: string) {
    if (isSubmitting) return;
    
    // Set the message input to the retry content and submit
    messageInput = content;
    await tick();
    handleSubmit();
  }

  $: {
    scrollToBottom();
  }
</script>

<div class="relative h-full overflow-hidden">
  <!-- Progress bar - positioned absolutely at top -->
  {#if !$isModelLoaded && $modelLoadingProgress < 100}
    <div class="absolute top-0 left-0 right-0 z-20 p-4 bg-surface-100-800-token border-b border-surface-300-600-token">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Loading Model: {$currentModel}</span>
        <span class="text-sm text-surface-600-300-token">{$modelLoadingProgress}%</span>
      </div>
      <ProgressBar value={$modelLoadingProgress} max={100} class="mb-2" />
      <p class="text-xs text-surface-600-300-token">{$modelLoadingStatus}</p>
    </div>
  {/if}
  
  <!-- Chat messages - positioned absolutely, independent of input -->
  <div 
    bind:this={chatContainer}
    class="absolute inset-0 overflow-y-auto p-4 space-y-4 scroll-smooth"
    class:pt-24={!$isModelLoaded && $modelLoadingProgress < 100}
    style="padding-bottom: 10rem; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;"
    on:scroll={handleScroll}
  >
    {#if $currentMessages.length === 0}
      <div class="text-center text-surface-600-300-token mt-8">
        <div class="text-6xl mb-4">💬</div>
        <h2 class="h3 mb-2">Welcome to WebLLM Chat</h2>
        <p>Start a conversation by typing a message below.</p>
        {#if !$isModelLoaded}
          <p class="text-sm mt-2">Loading model... Please wait.</p>
        {/if}
      </div>
    {:else}
      {#each $currentMessages as message (message.id)}
        <ChatMessage {message} onRetry={handleRetry} />
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

  <!-- Gradient fade for smooth scroll under effect -->
  <div class="absolute bottom-20 left-0 right-0 h-24 bg-gradient-to-t from-surface-100-800-token to-transparent pointer-events-none z-40"></div>
  
  <div class="absolute bottom-0 left-0 right-0 bg-surface-100-800-token border-t border-surface-300-600-token p-4 z-50">
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