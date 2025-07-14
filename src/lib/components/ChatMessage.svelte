<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import type { ChatMessage } from '$lib/types';
  import { formatTokenCount } from '$lib/utils/tokenCount';
  import { formatResponseTime } from '$lib/utils/timeFormat';
  import hljs from 'highlight.js/lib/core';
  
  // Import common languages
  import javascript from 'highlight.js/lib/languages/javascript';
  import typescript from 'highlight.js/lib/languages/typescript';
  import python from 'highlight.js/lib/languages/python';
  import json from 'highlight.js/lib/languages/json';
  import css from 'highlight.js/lib/languages/css';
  import xml from 'highlight.js/lib/languages/xml'; // HTML
  import bash from 'highlight.js/lib/languages/bash';
  import sql from 'highlight.js/lib/languages/sql';
  import markdown from 'highlight.js/lib/languages/markdown';
  import java from 'highlight.js/lib/languages/java';
  import cpp from 'highlight.js/lib/languages/cpp';
  import csharp from 'highlight.js/lib/languages/csharp';
  import php from 'highlight.js/lib/languages/php';
  import swift from 'highlight.js/lib/languages/swift';
  import go from 'highlight.js/lib/languages/go';
  import rust from 'highlight.js/lib/languages/rust';
  
  // Register languages
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('html', xml); // HTML uses XML syntax
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('shell', bash); // Alias
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('markdown', markdown);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('cpp', cpp);
  hljs.registerLanguage('c++', cpp); // Alias
  hljs.registerLanguage('csharp', csharp);
  hljs.registerLanguage('cs', csharp); // Alias
  hljs.registerLanguage('php', php);
  hljs.registerLanguage('swift', swift);
  hljs.registerLanguage('go', go);
  hljs.registerLanguage('rust', rust);

  export let message: ChatMessage;
  export let onRetry: ((content: string) => void) | undefined = undefined;

  let messageElement: HTMLElement;

  onMount(() => {
    highlightCode();
  });
  
  afterUpdate(() => {
    // Re-highlight on updates (for streaming)
    highlightCode();
  });

  function highlightCode() {
    if (!messageElement || typeof window === 'undefined') return;
    
    try {
      // Find all code blocks that haven't been highlighted yet
      const codeBlocks = messageElement.querySelectorAll('pre code:not(.hljs)');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    } catch (error) {
      console.warn('Failed to apply syntax highlighting:', error);
    }
  }

  function formatContent(content: string): string {
    // Create unique placeholders for code blocks to protect them from br conversion
    const codeBlockPlaceholders: string[] = [];
    
    // First, handle regular markdown code blocks
    let result = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      const placeholder = `__CODE_BLOCK_${codeBlockPlaceholders.length}__`;
      codeBlockPlaceholders.push(`<pre><code class="language-${language}">${code.trim()}</code></pre>`);
      return placeholder;
    });
    
    // Then detect code blocks that look like code (preserve line breaks)
    result = result.replace(/^((?:def |class |import |from |if |for |while |try |except |return |print\(|function |const |let |var |public |private |protected |#include |using |namespace |int |void |string |bool |char |float |double |SELECT |INSERT |UPDATE |DELETE |CREATE |ALTER |DROP).+(?:\n(?:\s{2,}.*|\s*(?:def |class |import |from |if |for |while |try |except |return |print\(|function |const |let |var |public |private |protected |#include |using |namespace |int |void |string |bool |char |float |double |SELECT |INSERT |UPDATE |DELETE |CREATE |ALTER |DROP|else|elif|except|finally|end|}).*)*)*)/gm, (match) => {
      // Try to detect language
      let language = 'text';
      if (/^(def |class |import |from |if |for |while |try |except |return |print\()/m.test(match)) {
        language = 'python';
      } else if (/^(function |const |let |var |console\.log|document\.|window\.|=>)/m.test(match)) {
        language = 'javascript';
      } else if (/^(public |private |protected |class |interface |enum |namespace)/m.test(match)) {
        language = 'typescript';
      } else if (/^(SELECT |INSERT |UPDATE |DELETE |CREATE |ALTER |DROP)/m.test(match)) {
        language = 'sql';
      } else if (/^(#include |using |namespace |int |void |string |bool |char |float |double)/m.test(match)) {
        language = 'cpp';
      }
      const placeholder = `__CODE_BLOCK_${codeBlockPlaceholders.length}__`;
      codeBlockPlaceholders.push(`<pre><code class="language-${language}">${match.trim()}</code></pre>`);
      return placeholder;
    });
    
    // Handle other markdown formatting and convert newlines to br for non-code content
    result = result
      .replace(/`([^`]+)`/g, '<code class="bg-surface-200-700-token px-1 rounded">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    // Restore code blocks (they preserve their original newlines)
    codeBlockPlaceholders.forEach((codeBlock, index) => {
      result = result.replace(`__CODE_BLOCK_${index}__`, codeBlock);
    });
    
    return result;
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
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
      
      <div class="prose prose-sm max-w-none dark:prose-invert">
        {@html formatContent(message.content)}
      </div>
      
      {#if message.role === 'user' && onRetry}
        <div class="mt-2">
          <button
            class="btn btn-sm variant-ghost-surface text-xs"
            on:click={() => onRetry && onRetry(message.content)}
            title="Retry this prompt"
          >
            <i class="fa fa-redo mr-1"></i>
            Retry
          </button>
        </div>
      {/if}
      
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

<style>
  .prose :global(code) {
    @apply dark:bg-surface-700 dark:text-surface-100;
  }
  
  .prose :global(pre) {
    @apply dark:bg-surface-800 dark:text-surface-100;
  }
  
  .prose :global(pre code) {
    @apply dark:bg-transparent;
  }
  
  /* Ensure text is light in dark mode */
  :global(.dark) .prose {
    @apply text-surface-100;
  }
  
  :global(.dark) .prose :global(strong) {
    @apply text-surface-50;
  }
  
  :global(.dark) .prose :global(em) {
    @apply text-surface-200;
  }
</style>