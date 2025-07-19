<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import type { ChatMessage } from '$lib/types';
  import { formatTokenCount } from '$lib/utils/tokenCount';
  import { formatResponseTime } from '$lib/utils/timeFormat';
  import hljs from 'highlight.js/lib/core';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import { modelLoadingProgress, modelLoadingStatus, currentModel, isModelLoaded } from '$lib/stores/models';

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
  export let onClose: ((messageId: string) => void) | undefined = undefined;
  
  let isCollapsed = false;
  
  // Check if this is a model loading message
  $: isModelLoadingMessage = message.id.startsWith('loading-model-') && 
    (message.content.includes('🔄 Switching to') || 
     message.content.includes('🤖') ||
     message.content.includes('Loading model'));
     
  // Extract model name from loading message
  $: loadingModelName = isModelLoadingMessage && message.content.includes('Switching to') 
    ? message.content.match(/Switching to (.+?)\.\.\./)?.[ 1] || $currentModel 
    : $currentModel;

  // For code blocks, we'll estimate token count (rough approximation)
  function estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  let messageElement: HTMLElement;

  onMount(() => {
    highlightCode();
    attachCommandHandlers();
  });

  afterUpdate(() => {
    // Re-highlight on updates (for streaming)
    highlightCode();
    attachCommandHandlers();
  });

  function attachCommandHandlers() {
    if (!messageElement || typeof window === 'undefined') return;

    // Find all command buttons that haven't been processed yet
    const commandButtons = messageElement.querySelectorAll(
      'button[data-command]:not([data-command-attached])'
    );
    commandButtons.forEach((button) => {
      // Mark as processed
      button.setAttribute('data-command-attached', 'true');

      button.addEventListener('click', (e) => {
        const command = (e.target as HTMLElement).getAttribute('data-command');
        if (command) {
          // Find the message input and set the command
          const messageInput = document.querySelector('#message-input') as HTMLTextAreaElement;
          if (messageInput) {
            messageInput.value = command;
            messageInput.focus();
            // Dispatch input event to update Svelte binding
            messageInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });
    });
  }

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
        workingContent = content.replace(
          '__STREAMING_CURSOR__',
          '<span class="dos-cursor">█</span>'
        );
        return workingContent;
      }

      // Replace cursor with visible cursor
      workingContent = content.replace('__STREAMING_CURSOR__', '<span class="dos-cursor">█</span>');
    }

    // First, handle regular markdown code blocks - use non-greedy matching
    let result = workingContent.replace(/```(\w*)\s*\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      const displayLanguage =
        languageNames[language.toLowerCase()] ||
        language.charAt(0).toUpperCase() + language.slice(1);
      const placeholder = `__CODE_BLOCK_${codeBlockPlaceholders.length}__`;
      const codeContent = code.trim();
      const tokenCount = estimateTokens(codeContent);
      codeBlockPlaceholders.push(
        `<div class="code-block-container"><pre><code class="language-${language}">${escapeHtml(codeContent)}</code></pre><div class="code-block-footer-container"><span class="code-block-footer">${tokenCount} tokens 0.${Math.floor(Math.random() * 9) + 1}s</span><button class="code-block-copy-btn-v2" onclick="navigator.clipboard.writeText(this.closest('.code-block-container').querySelector('code').textContent)">Copy</button></div></div>`
      );
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
      if (
        !inCodeBlock &&
        (/^import\s+\w+/.test(trimmedLine) ||
          /^from\s+[\w.]+\s+import/.test(trimmedLine) ||
          /^class\s+\w+.*:/.test(trimmedLine) ||
          /^def\s+\w+.*:/.test(trimmedLine) ||
          /^#include\s*[<"]/.test(trimmedLine) ||
          /^(void|int|double|float|char|bool|string)\s+\w+/.test(trimmedLine) ||
          /^(public|private|protected):/.test(trimmedLine))
      ) {
        inCodeBlock = true;
        currentBlock = { start: i, end: i, content: [line] };
      } else if (inCodeBlock && currentBlock) {
        // Check if we should continue the code block
        if (
          trimmedLine === '' || // Empty line within code
          /^[\s]*#/.test(line) || // Comment
          /^[\s]+/.test(line) || // Indented line
          /^(if|elif|else|try|except|finally|with|for|while|return|pass|break|continue|raise|assert|yield|lambda|global|nonlocal|del)\b/.test(
            trimmedLine
          ) ||
          /^\w+\s*[=().]/.test(trimmedLine) || // Assignment or function call
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
      if (
        codeContent.includes('#include') ||
        codeContent.includes('std::') ||
        /\b(void|int|double|float|char|bool)\s+\w+/.test(codeContent)
      ) {
        language = 'cpp';
      } else if (
        codeContent.includes('import ') ||
        codeContent.includes('class ') ||
        codeContent.includes('def ')
      ) {
        language = 'python';
      } else if (
        codeContent.includes('function ') ||
        codeContent.includes('const ') ||
        codeContent.includes('let ')
      ) {
        language = 'javascript';
      }

      const displayLanguage =
        languageNames[language.toLowerCase()] ||
        language.charAt(0).toUpperCase() + language.slice(1);
      const placeholder = `__CODE_BLOCK_${codeBlockPlaceholders.length}__`;
      const tokenCount = estimateTokens(codeContent);
      codeBlockPlaceholders.push(`<div class="code-block-container"><pre><code class="language-${language}">${escapeHtml(codeContent)}</code></pre><div class="code-block-footer-container"><span class="code-block-footer">${tokenCount} tokens 0.${Math.floor(Math.random() * 9) + 1}s</span>
      <button class="code-block-copy-btn-v2" onclick="navigator.clipboard.writeText(this.closest('.code-block-container').querySelector('code').textContent)">Copy</button></div></div>`);

      // Replace the lines with the placeholder
      lines.splice(block.start, block.end - block.start + 1, placeholder);
    }

    result = lines.join('\n');

    // Handle other markdown formatting and convert newlines to br for non-code content
    result = result
      // Handle bold code blocks first (removes backticks when inside bold)
      .replace(/\*\*`([^`]+)`\*\*/g, '<strong>$1</strong>')
      // Then handle regular inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="bg-surface-200-700-token text-surface-700-200-token px-1 rounded ">$1</code>'
      )
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Handle markdown links - check for cmd: protocol
      .replace(/\[([^\]]+)\]\(cmd:([^)]+)\)/g, (match, text, command) => {
        const decodedCommand = decodeURIComponent(command);
        return `<button class="text-primary-500 hover:text-primary-600 underline cursor-pointer" data-command="${escapeHtml(decodedCommand)}">${escapeHtml(text)}</button>`;
      })
      // Handle regular markdown links
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline">$1</a>'
      )
      // Handle plain URLs (not already in markdown format)
      .replace(
        /(?<!\[.*?\]\()(https?:\/\/[^\s<>"]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary-500 hover:text-primary-600 underline">$1</a>'
      )
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

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }

  function closeMessage() {
    if (onClose) {
      onClose(message.id);
    }
  }

  function hasOriginalFileData(documentData: any): boolean {
    return documentData && documentData.originalFileData && documentData.originalFileData.length > 0;
  }

  function openDocumentPopup(documentData: any): void {
    try {
      // Check if we have original file data
      if (!documentData.originalFileData) {
        console.warn('No original file data available for document:', documentData.fileName);
        return;
      }

      // Determine the MIME type based on file extension
      const fileName = documentData.fileName.toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (fileName.endsWith('.pdf')) {
        mimeType = 'application/pdf';
      } else if (fileName.endsWith('.docx')) {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (fileName.endsWith('.doc')) {
        mimeType = 'application/msword';
      } else if (fileName.endsWith('.txt')) {
        mimeType = 'text/plain';
      } else if (fileName.endsWith('.md')) {
        mimeType = 'text/markdown';
      }

      // Decode base64 to binary
      const binaryString = atob(documentData.originalFileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and object URL
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Open in new window/tab
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        // If popup was blocked, try downloading instead
        const link = document.createElement('a');
        link.href = url;
        link.download = documentData.fileName;
        link.click();
      }

      // Clean up the URL after a delay to prevent memory leaks
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
    } catch (error) {
      console.error('Error opening document popup:', error);
    }
  }
</script>

<div class="chat-message {message.role}" bind:this={messageElement}>
  <div class="flex items-start space-x-3">
    <div class="flex-shrink-0">
      {#if message.role === 'user'}
        <div
          class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
        >
          U
        </div>
      {:else}
        <div
          class="w-8 h-8 bg-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-bold"
        >
          AI
        </div>
      {/if}
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center space-x-2">
          <span class="font-semibold text-sm text-surface-700-200-token">
            {message.role === 'user' ? 'You' : 'Assistant'}
          </span>
          <span class="text-xs text-surface-700-200-token opacity-70">
            {formatTimestamp(message.timestamp)}
          </span>
          {#if message.tokenCount && message.tokenCount > 0}
            <span
              class="text-xs text-surface-700-200-token opacity-80 bg-surface-200-700-token px-2 py-0.5 rounded"
            >
              {formatTokenCount(message.tokenCount)}
            </span>
          {:else if message.content && message.content.length > 0}
            <span class="text-xs text-red-200 bg-red-500/30 px-2 py-0.5 rounded"> No tokens </span>
          {/if}
          {#if message.role === 'assistant' && message.responseTime}
            <span
              class="text-xs text-surface-700-200-token opacity-80 bg-surface-200-700-token px-2 py-0.5 rounded"
            >
              ⏱️ {formatResponseTime(message.responseTime)}
            </span>
          {/if}
        </div>
        
        <!-- Collapse and Close buttons -->
        <div class="flex items-center space-x-1">
          <button
            class="btn-icon btn-icon-sm variant-ghost-surface opacity-70 hover:opacity-100"
            on:click={toggleCollapse}
            title={isCollapsed ? 'Expand message' : 'Collapse message'}
            aria-label={isCollapsed ? 'Expand message' : 'Collapse message'}
          >
            <i class="fa {isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs"></i>
          </button>
          <button
            class="btn-icon btn-icon-sm variant-ghost-surface opacity-70 hover:opacity-100"
            on:click={closeMessage}
            title="Close message"
            aria-label="Close message"
          >
            <i class="fa fa-times text-xs"></i>
          </button>
        </div>
      </div>

      {#if !isCollapsed}
        {#if message.content && message.content.trim().length > 0}
          <div class="prose prose-sm max-w-none text-surface-700-200-token">
            {@html formatContent(message.content)}
          </div>
          
          <!-- Show loading progress bar for model loading messages -->
          {#if isModelLoadingMessage && !$isModelLoaded && $modelLoadingProgress < 100}
            <div class="mt-4 p-3 bg-surface-200-700-token rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-surface-700-200-token">
                  Loading Model: {loadingModelName}
                </span>
                <span class="text-sm text-surface-700-200-token opacity-70">
                  {$modelLoadingProgress}%
                </span>
              </div>
              <ProgressBar value={$modelLoadingProgress} max={100} class="mb-2" />
              <p class="text-xs text-surface-700-200-token opacity-70">{$modelLoadingStatus}</p>
            </div>
          {/if}
        {/if}
      {/if}

      {#if !isCollapsed}
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

        {#if message.documentData && hasOriginalFileData(message.documentData)}
          <div class="mt-2">
            <button
              class="btn btn-sm variant-ghost-primary text-xs"
              on:click={() => openDocumentPopup(message.documentData)}
              title="View original document"
            >
              <i class="fa fa-external-link-alt mr-1"></i>
              View Original
            </button>
          </div>
        {/if}
      {/if}

      {#if !isCollapsed && message.chunks && message.chunks.length > 0}
        <div class="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div class="flex items-center gap-2 mb-2">
            <div class="flex items-center gap-1 text-blue-500">
              <i class="fa fa-brain text-sm"></i>
              <span class="text-xs font-semibold">RAG ACTIVE</span>
            </div>
            <div class="text-xs text-surface-600-300-token">
              Using {message.chunks.length} source chunk{message.chunks.length !== 1 ? 's' : ''}
            </div>
          </div>

          <details>
            <summary
              class="text-xs text-surface-700-200-token opacity-70 cursor-pointer hover:opacity-100 flex items-center gap-1"
            >
              <i class="fa fa-search text-xs"></i>
              View RAG Sources ({message.chunks.length})
            </summary>
            <div class="mt-2 space-y-2">
              {#each message.chunks as chunk, index}
                <div
                  class="text-xs bg-surface-200-700-token p-2 rounded border-l-2 border-blue-500"
                >
                  <div
                    class="font-semibold text-surface-700-200-token mb-1 flex items-center justify-between"
                  >
                    <span>
                      📄 {chunk.metadata.filename}
                      {#if chunk.metadata.page}
                        (Page {chunk.metadata.page})
                      {/if}
                    </span>
                    {#if chunk.metadata.similarity}
                      <span class="bg-blue-500/20 text-blue-500 px-1 rounded text-xs">
                        {Math.round(chunk.metadata.similarity * 100)}% match
                      </span>
                    {:else if chunk.metadata.score}
                      <span class="bg-blue-500/20 text-blue-500 px-1 rounded text-xs">
                        {Math.round(chunk.metadata.score * 100)}% relevance
                      </span>
                    {/if}
                  </div>
                  <div class="text-surface-700-200-token opacity-80 italic">
                    "{chunk.content.slice(0, 200)}{chunk.content.length > 200 ? '...' : ''}"
                  </div>
                  <div class="text-xs text-surface-600-300-token mt-1">
                    Chunk #{index + 1} • {chunk.content.length} characters
                  </div>
                </div>
              {/each}
            </div>
          </details>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- No custom styling - let Skeleton UI handle everything -->
