<script lang="ts">
  import { onMount } from 'svelte';
  import type { ChatMessage } from '$lib/types';
  import { formatTokenCount } from '$lib/utils/tokenCount';
  import { formatResponseTime } from '$lib/utils/timeFormat';

  export let message: ChatMessage;

  let messageElement: HTMLElement;

  onMount(async () => {
    if (messageElement) {
      await highlightCode();
    }
  });

  async function highlightCode() {
    if (typeof window === 'undefined') return;
    
    try {
      // Only load Prism.js on the client side
      const codeBlocks = messageElement.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        block.classList.add('hljs');
      });
    } catch (error) {
      console.warn('Failed to load syntax highlighting:', error);
    }
  }

  function formatContent(content: string): string {
    return content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
      })
      .replace(/`([^`]+)`/g, '<code class="bg-surface-200-700-token px-1 rounded">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  $: {
    if (messageElement) {
      highlightCode();
    }
  }
</script>

<div class="chat-message {message.role}" bind:this={messageElement}>
  <div class="flex items-start space-x-3">
    <div class="flex-shrink-0">
      {#if message.role === 'user'}
        <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
          U
        </div>
      {:else}
        <div class="w-8 h-8 bg-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
          AI
        </div>
      {/if}
    </div>
    
    <div class="flex-1 min-w-0">
      <div class="flex items-center space-x-2 mb-1">
        <span class="font-semibold text-sm">
          {message.role === 'user' ? 'You' : 'Assistant'}
        </span>
        <span class="text-xs text-surface-600-300-token">
          {formatTimestamp(message.timestamp)}
        </span>
        {#if message.tokenCount}
          <span class="text-xs text-surface-600-300-token bg-surface-200-700-token px-2 py-0.5 rounded">
            {formatTokenCount(message.tokenCount)}
          </span>
        {:else}
          <span class="text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded">
            No tokens
          </span>
        {/if}
        {#if message.role === 'assistant' && message.responseTime}
          <span class="text-xs text-surface-600-300-token bg-tertiary-200-700-token px-2 py-0.5 rounded">
            ⏱️ {formatResponseTime(message.responseTime)}
          </span>
        {/if}
      </div>
      
      <div class="prose prose-sm max-w-none">
        {@html formatContent(message.content)}
      </div>
      
      {#if message.chunks && message.chunks.length > 0}
        <details class="mt-3">
          <summary class="text-xs text-surface-600-300-token cursor-pointer hover:text-surface-800-200-token">
            Sources ({message.chunks.length})
          </summary>
          <div class="mt-2 space-y-2">
            {#each message.chunks as chunk}
              <div class="text-xs bg-surface-200-700-token p-2 rounded border-l-2 border-primary-500">
                <div class="font-semibold text-surface-800-200-token mb-1">
                  {chunk.metadata.filename}
                  {#if chunk.metadata.page}
                    (Page {chunk.metadata.page})
                  {/if}
                  {#if chunk.metadata.score}
                    - Relevance: {Math.round(chunk.metadata.score * 100)}%
                  {/if}
                </div>
                <div class="text-surface-600-300-token">
                  {chunk.content.slice(0, 200)}...
                </div>
              </div>
            {/each}
          </div>
        </details>
      {/if}
    </div>
  </div>
</div>