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

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatContent(content: string): string {
    // Create unique placeholders for code blocks to protect them from br conversion
    const codeBlockPlaceholders: string[] = [];
    
    // Language display name mapping
    const languageNames: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      java: 'Java',
      cpp: 'C++',
      csharp: 'C#',
      php: 'PHP',
      swift: 'Swift',
      go: 'Go',
      rust: 'Rust',
      sql: 'SQL',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      xml: 'XML',
      bash: 'Bash',
      shell: 'Shell',
      text: 'Plain Text'
    };
    
    // Check if this is a streaming message (contains cursor)
    const isStreaming = content.includes('__STREAMING_CURSOR__');
    let workingContent = content;
    
    // If streaming, handle potential partial triple backticks
    if (isStreaming) {
      // Store cursor position
      const cursorIndex = workingContent.indexOf('__STREAMING_CURSOR__');
      
      // Check if we have partial backticks before the cursor
      const beforeCursor = workingContent.substring(0, cursorIndex);
      const afterCursor = workingContent.substring(cursorIndex + '__STREAMING_CURSOR__'.length);
      
      // Handle partial opening backticks (e.g., ` or ``)
      if (beforeCursor.endsWith('`') || beforeCursor.endsWith('``')) {
        // Don't process markdown yet, wait for complete triple backticks
        workingContent = content.replace('__STREAMING_CURSOR__', '<span class="dos-cursor">█</span>');
        return workingContent;
      }
      
      // Replace cursor with visible cursor
      workingContent = content.replace('__STREAMING_CURSOR__', '<span class="dos-cursor">█</span>');
    }
    
    // First, handle regular markdown code blocks - use non-greedy matching
    let result = workingContent.replace(/```(\w*)\s*\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      const displayLanguage = languageNames[language.toLowerCase()] || language.charAt(0).toUpperCase() + language.slice(1);
      const placeholder = `__CODE_BLOCK_${codeBlockPlaceholders.length}__`;
      codeBlockPlaceholders.push(`<div class="code-block-container"><pre><code class="language-${language}">${escapeHtml(code.trim())}</code></pre><div class="code-block-footer-container"><span class="code-block-footer">${escapeHtml(displayLanguage)}</span></div></div>`);
      return placeholder;
    });
    
    // Auto-detect Python code blocks by looking for consistent code structure
    // First, let's identify potential code sections
    const lines = result.split('\n');
    const codeBlocks: { start: number; end: number; content: string[] }[] = [];
    let inCodeBlock = false;
    let currentBlock: { start: number; end: number; content: string[] } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if this line starts a code block
      if (!inCodeBlock && (
        /^import\s+\w+/.test(trimmedLine) ||
        /^from\s+[\w.]+\s+import/.test(trimmedLine) ||
        /^class\s+\w+.*:/.test(trimmedLine) ||
        /^def\s+\w+.*:/.test(trimmedLine) ||
        /^#include\s*[<"]/.test(trimmedLine) ||
        /^(void|int|double|float|char|bool|string)\s+\w+/.test(trimmedLine) ||
        /^(public|private|protected):/.test(trimmedLine)
      )) {
        inCodeBlock = true;
        currentBlock = { start: i, end: i, content: [line] };
      } else if (inCodeBlock && currentBlock) {
        // Check if we should continue the code block
        if (
          trimmedLine === '' || // Empty line within code
          /^[\s]*#/.test(line) || // Comment
          /^[\s]+/.test(line) || // Indented line
          /^(if|elif|else|try|except|finally|with|for|while|return|pass|break|continue|raise|assert|yield|lambda|global|nonlocal|del)\b/.test(trimmedLine) ||
          /^\w+\s*[=\(\.]/.test(trimmedLine) || // Assignment or function call
          /^[\w.]+\(/.test(trimmedLine) // Function call
        ) {
          currentBlock.content.push(line);
          currentBlock.end = i;
        } else if (trimmedLine !== '' && /^[A-Z][a-z]/.test(trimmedLine)) {
          // This looks like prose text, end the code block
          if (currentBlock.content.length > 1) {
            codeBlocks.push(currentBlock);
          }
          inCodeBlock = false;
          currentBlock = null;
        }
      }
    }
    
    // Add the last block if we're still in one
    if (inCodeBlock && currentBlock && currentBlock.content.length > 1) {
      codeBlocks.push(currentBlock);
    }
    
    // Now replace the code blocks in reverse order to maintain positions
    for (let i = codeBlocks.length - 1; i >= 0; i--) {
      const block = codeBlocks[i];
      const codeContent = block.content.join('\n');
      
      // Detect language based on content
      let language = 'text';
      if (codeContent.includes('#include') || codeContent.includes('std::') || /\b(void|int|double|float|char|bool)\s+\w+/.test(codeContent)) {
        language = 'cpp';
      } else if (codeContent.includes('import ') || codeContent.includes('class ') || codeContent.includes('def ')) {
        language = 'python';
      } else if (codeContent.includes('function ') || codeContent.includes('const ') || codeContent.includes('let ')) {
        language = 'javascript';
      }
      
      const displayLanguage = languageNames[language.toLowerCase()] || language.charAt(0).toUpperCase() + language.slice(1);
      const placeholder = `__CODE_BLOCK_${codeBlockPlaceholders.length}__`;
      codeBlockPlaceholders.push(`<div class="code-block-container"><pre><code class="language-${language}">${escapeHtml(codeContent)}</code></pre><div class="code-block-footer-container"><span class="code-block-footer">${escapeHtml(displayLanguage)}</span></div></div>`);
      
      // Replace the lines with the placeholder
      lines.splice(block.start, block.end - block.start + 1, placeholder);
    }
    
    result = lines.join('\n');
    
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