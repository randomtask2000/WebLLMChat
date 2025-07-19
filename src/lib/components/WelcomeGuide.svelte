<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { appConfig } from '$lib/config/app.config';

  export let isVisible = false;

  let hasSeenGuide = false;
  let dontShowAgain = false;

  onMount(() => {
    // Check if user has seen the guide before
    hasSeenGuide = localStorage.getItem('webllm-guide-seen') === 'true';
    if (!hasSeenGuide) {
      isVisible = true;
    }
  });

  function dismissGuide() {
    if (dontShowAgain) {
      localStorage.setItem('webllm-guide-seen', 'true');
    }
    isVisible = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      dismissGuide();
    }
  }
</script>

{#if isVisible}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="welcome-title"
    on:keydown={handleKeydown}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="bg-surface-100-800-token rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-y-auto"
      transition:scale={{ duration: 300, easing: quintOut }}
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="sticky top-0 bg-surface-100-800-token border-b border-surface-300-600-token p-6">
        <h2 id="welcome-title" class="text-2xl font-bold flex items-center gap-3">
          <span class="text-4xl">🎉</span>
          Welcome to {appConfig.title}!
        </h2>
        <p class="text-surface-600-300-token mt-2">
          Your privacy-first AI assistant with powerful document analysis
        </p>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Key Features -->
        <section>
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <span class="text-2xl">✨</span>
            Key Features
          </h3>
          <div class="grid md:grid-cols-2 gap-4">
            <div class="bg-surface-200-700-token rounded-lg p-4">
              <h4 class="font-semibold mb-2 flex items-center gap-2">
                <span>🔒</span> 100% Private
              </h4>
              <p class="text-sm text-surface-600-300-token">
                Everything runs in your browser. No data sent to servers. Your conversations and documents stay private.
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-4">
              <h4 class="font-semibold mb-2 flex items-center gap-2">
                <span>📚</span> RAG-Powered
              </h4>
              <p class="text-sm text-surface-600-300-token">
                Upload documents and ask questions. The AI searches your files to provide accurate, contextual answers.
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-4">
              <h4 class="font-semibold mb-2 flex items-center gap-2">
                <span>🌐</span> Works Offline
              </h4>
              <p class="text-sm text-surface-600-300-token">
                After initial model download, works completely offline. Perfect for sensitive documents.
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-4">
              <h4 class="font-semibold mb-2 flex items-center gap-2">
                <span>🚀</span> WebGPU Accelerated
              </h4>
              <p class="text-sm text-surface-600-300-token">
                Leverages your GPU for fast responses. No cloud computing costs or rate limits.
              </p>
            </div>
          </div>
        </section>

        <!-- Supported Documents -->
        <section>
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <span class="text-2xl">📄</span>
            Supported Document Types
          </h3>
          <div class="bg-surface-200-700-token rounded-lg p-4 space-y-2">
            <div class="flex items-center gap-3">
              <span class="text-xl">📕</span>
              <div>
                <span class="font-semibold">PDF Files</span>
                <span class="text-sm text-surface-600-300-token ml-2">
                  Full text extraction with metadata (title, author, pages)
                </span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xl">📘</span>
              <div>
                <span class="font-semibold">Word Documents (.docx)</span>
                <span class="text-sm text-surface-600-300-token ml-2">
                  Preserves structure (headings, lists, paragraphs)
                </span>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xl">📝</span>
              <div>
                <span class="font-semibold">Text & Markdown</span>
                <span class="text-sm text-surface-600-300-token ml-2">
                  Plain text and markdown files
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Commands -->
        <section>
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <span class="text-2xl">💬</span>
            Useful Commands
          </h3>
          <div class="bg-surface-200-700-token rounded-lg p-4 space-y-3">
            <div>
              <code class="bg-surface-300-600-token px-2 py-1 rounded text-sm">/help</code>
              <span class="text-sm text-surface-600-300-token ml-2">
                Show all available commands and features
              </span>
            </div>
            <div>
              <code class="bg-surface-300-600-token px-2 py-1 rounded text-sm">/find [term]</code>
              <span class="text-sm text-surface-600-300-token ml-2">
                Find exact sentences containing a specific term
              </span>
            </div>
            <div>
              <code class="bg-surface-300-600-token px-2 py-1 rounded text-sm">/chunks</code>
              <span class="text-sm text-surface-600-300-token ml-2">
                Show all RAG chunks in order with full content
              </span>
            </div>
            <div>
              <code class="bg-surface-300-600-token px-2 py-1 rounded text-sm">/debug rag</code>
              <span class="text-sm text-surface-600-300-token ml-2">
                Show RAG system information and indexed documents
              </span>
            </div>
          </div>
        </section>

        <!-- Quick Start -->
        <section>
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <span class="text-2xl">🚀</span>
            Quick Start
          </h3>
          <ol class="space-y-2 text-sm">
            <li class="flex gap-2">
              <span class="font-semibold text-primary-500">1.</span>
              <span>Wait for the AI model to load (first time takes 1-5 minutes)</span>
            </li>
            <li class="flex gap-2">
              <span class="font-semibold text-primary-500">2.</span>
              <span>Upload documents using the <i class="fa fa-paperclip"></i> button or drag & drop</span>
            </li>
            <li class="flex gap-2">
              <span class="font-semibold text-primary-500">3.</span>
              <span>Ask questions about your documents or use the AI normally</span>
            </li>
            <li class="flex gap-2">
              <span class="font-semibold text-primary-500">4.</span>
              <span>Click the brain icon <i class="fa fa-brain"></i> to see RAG context</span>
            </li>
          </ol>
        </section>

        <!-- Technology Stack -->
        <section>
          <h3 class="text-lg font-semibold mb-3 flex items-center gap-2">
            <span class="text-2xl">⚡</span>
            Built With Modern Technology
          </h3>
          <div class="grid md:grid-cols-2 gap-3 text-sm mb-4">
            <div class="bg-surface-200-700-token rounded-lg p-3">
              <h4 class="font-semibold text-primary-500 mb-1">Core Framework</h4>
              <p class="text-surface-600-300-token">
                <strong>SvelteKit + Svelte 5</strong> - Lightning-fast reactive UI with compile-time optimizations and full-stack capabilities
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-3">
              <h4 class="font-semibold text-primary-500 mb-1">AI & Machine Learning</h4>
              <p class="text-surface-600-300-token">
                <strong>WebLLM + WebGPU</strong> - Run large language models directly in your browser with GPU acceleration
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-3">
              <h4 class="font-semibold text-primary-500 mb-1">Document Processing</h4>
              <p class="text-surface-600-300-token">
                <strong>PDF.js + Mammoth.js</strong> - Client-side PDF and DOCX text extraction with metadata support
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-3">
              <h4 class="font-semibold text-primary-500 mb-1">UI & Styling</h4>
              <p class="text-surface-600-300-token">
                <strong>Skeleton UI + Tailwind CSS</strong> - Adaptive UI toolkit with utility-first styling
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-3">
              <h4 class="font-semibold text-primary-500 mb-1">RAG System</h4>
              <p class="text-surface-600-300-token">
                <strong>TF-IDF + IndexedDB</strong> - Lightweight embeddings with browser-based vector storage
              </p>
            </div>
            <div class="bg-surface-200-700-token rounded-lg p-3">
              <h4 class="font-semibold text-primary-500 mb-1">Build & Testing</h4>
              <p class="text-surface-600-300-token">
                <strong>Vite + Vitest + Playwright</strong> - Fast builds with comprehensive test coverage
              </p>
            </div>
          </div>
          
          <div class="space-y-3">
            <div class="text-xs text-surface-600-300-token bg-surface-200-700-token rounded-lg p-3">
              <p class="font-semibold mb-2 text-primary-500">🔧 Additional Technologies:</p>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <span class="font-semibold">Language:</span> TypeScript
                </div>
                <div>
                  <span class="font-semibold">Syntax Highlighting:</span> Highlight.js
                </div>
                <div>
                  <span class="font-semibold">Storage:</span> IndexedDB + localStorage
                </div>
                <div>
                  <span class="font-semibold">Background Processing:</span> Web Workers
                </div>
                <div>
                  <span class="font-semibold">Mobile Support:</span> Capacitor (iOS/Android)
                </div>
                <div>
                  <span class="font-semibold">Code Quality:</span> ESLint + Prettier
                </div>
              </div>
            </div>
            
            <div class="text-xs text-surface-600-300-token bg-primary-500/10 rounded-lg p-3">
              <p class="font-semibold mb-1 text-primary-500">🏗️ Architecture Highlights:</p>
              <ul class="space-y-1">
                <li>• <strong>100% Client-Side:</strong> All processing happens in your browser</li>
                <li>• <strong>Privacy-First:</strong> No data leaves your device</li>
                <li>• <strong>Offline Capable:</strong> Works without internet after model download</li>
                <li>• <strong>WebGPU Accelerated:</strong> Leverages your GPU for fast inference</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Tips -->
        <section class="bg-primary-500/10 rounded-lg p-4">
          <h3 class="text-sm font-semibold mb-2 flex items-center gap-2">
            <span>💡</span>
            Pro Tips
          </h3>
          <ul class="text-sm space-y-1 text-surface-600-300-token">
            <li>• Models are cached after first download - subsequent loads are instant</li>
            <li>• Upload multiple documents to create a knowledge base</li>
            <li>• Adjust search accuracy in the RAG panel for better results</li>
            <li>• Use natural language - ask questions like you would to a human</li>
          </ul>
        </section>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-surface-100-800-token border-t border-surface-300-600-token p-6 flex items-center justify-between">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" bind:checked={dontShowAgain} class="checkbox" />
          <span>Don't show this again</span>
        </label>
        <button
          class="btn variant-filled-primary"
          on:click={dismissGuide}
        >
          Get Started
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for the guide */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.5);
  }
</style>