<script lang="ts">
  import { onMount, afterUpdate, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { ProgressBar } from '@skeletonlabs/skeleton';
  import {
    currentMessages,
    addMessage,
    updateLastMessage,
    startResponseTiming,
    isTyping,
    saveChatHistory,
    retryLastUserMessage
  } from '$lib/stores/chat';
  import { generateChatResponse, webLLMService } from '$lib/utils/webllm';
  import { loadModelWithChatBubble } from '$lib/utils/model-loading';
  import { searchDocuments } from '$lib/stores/documents';
  import {
    currentModel,
    isModelLoaded,
    modelLoadingProgress,
    modelLoadingStatus
  } from '$lib/stores/models';
  import ChatMessage from './ChatMessage.svelte';
  import DragDropZone from './DragDropZone.svelte';
  import RAGContext from './RAGContext.svelte';
  import FeatureToggle from './FeatureToggle.svelte';
  import type { ChatMessage as ChatMessageType } from '$lib/types';
  import type { RAGQueryResult } from '$lib/types/rag';
  import { featureManager } from '$lib/config/features';
  import { ragService } from '$lib/services/rag-service';
  import { processDocument } from '$lib/utils/document-processor';

  let chatContainer: HTMLElement;
  let messageInput = '';
  let isSubmitting = false;
  let mounted = false;
  let shouldAutoScroll = true;
  let scrollTimeout: ReturnType<typeof setTimeout>;
  let showRAGPanel = true;
  let lastRAGQuery: RAGQueryResult | null = null;
  let uploadingFiles = false;
  let showFeatureToggle = false;
  let fileInput: HTMLInputElement;
  let ragRefreshCounter = 0;

  onMount(() => {
    mounted = true;

    // Add keyboard listener for feature toggle (Ctrl+Shift+F)
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        showFeatureToggle = true;
      }
    };

    window.addEventListener('keydown', handleKeyboard);

    // Initialize model loading asynchronously
    initializeModel();

    return () => {
      window.removeEventListener('keydown', handleKeyboard);
    };
  });

  async function initializeModel() {
    // Only run on client side
    if (!browser) {
      console.log('Not in browser, skipping model loading');
      return;
    }

    try {
      console.log('ChatInterface onMount starting...');

      // Wait a bit for stores to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

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
  }

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

    // Handle slash commands
    const trimmedInput = messageInput.trim().toLowerCase();

    // Help command
    if (trimmedInput === '/help' || trimmedInput === '/?') {
      // Add user message to chat history before clearing input
      const userMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageInput.trim(),
        timestamp: Date.now()
      };
      addMessage(userMessage);
      
      messageInput = '';
      const helpMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          `**Available Commands:**\n\n` +
          `• \`/debug rag\` or \`/rag-debug\` - Show RAG system information\n` +
          `• \`/find [term]\` - Find exact sentences containing a term\n` +
          `• \`/help\` or \`/?\` - Show this help message\n\n` +
          `**Quick Actions:**\n` +
          `• [Click here to run: /debug rag](cmd:/debug%20rag)\n` +
          `• [Click here to run: /find](cmd:/find%20)\n` +
          `• [Click here to run: /help](cmd:/help)\n\n` +
          `**Finding Exact Sentences:**\n` +
          `• **Command**: \`/find [term]\` - finds all sentences with "[term]"\n` +
          `• **Natural Language**: Ask naturally using phrases like:\n` +
          `  - "Find sentences containing [term]"\n` +
          `  - "Show me the exact sentence with [term]"\n` +
          `  - "Quote the sentence about Jacob"\n` +
          `  - "Find where it says about Lehi"\n` +
          `• Results show exact sentences with terms **highlighted**\n\n` +
          `**RAG Features:**\n` +
          `• Drag & drop files into chat area\n` +
          `• Use + button to upload documents\n` +
          `• Ask questions about uploaded documents\n` +
          `• Adjust search accuracy in RAG Context panel`,
        timestamp: Date.now()
      };
      addMessage(helpMessage);
      return;
    }

    // Debug command to show RAG contents
    if (trimmedInput === '/rag-debug' || trimmedInput === '/debug rag') {
      // Add user message to chat history before clearing input
      const userMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageInput.trim(),
        timestamp: Date.now()
      };
      addMessage(userMessage);
      
      messageInput = '';
      await showRAGDebugInfo();
      return;
    }

    // Find command to search for exact sentences
    if (trimmedInput.startsWith('/find ')) {
      const searchTerm = messageInput.trim().substring(6); // Remove '/find '
      
      // Add user message to chat history before clearing input
      const userMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageInput.trim(),
        timestamp: Date.now()
      };
      addMessage(userMessage);
      
      messageInput = '';
      await findExactSentences(searchTerm);
      return;
    }

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
      let relevantChunks: any[] = [];
      let contextPrompt = userMessage.content;

      // Use RAG service if enabled and ready, otherwise fall back to existing document search
      if (featureManager.isEnabled('clientSideRAG') && ragService.isReady()) {
        try {
          // Check if any documents are indexed
          const documents = await ragService.getDocuments();

          if (documents.length === 0) {
            // No documents uploaded yet
            const noDocsMessage: ChatMessageType = {
              id: 'no-docs-' + Date.now(),
              role: 'assistant',
              content:
                '📚 No documents uploaded yet. Please upload documents using the + button or by dragging and dropping files into the chat area.',
              timestamp: Date.now()
            };
            addMessage(noDocsMessage);
            return;
          }

          // Add a temporary "searching" message
          const searchingMessage: ChatMessageType = {
            id: 'searching-' + Date.now(),
            role: 'assistant',
            content: `🔍 Searching through ${documents.length} document${documents.length > 1 ? 's' : ''}...`,
            timestamp: Date.now()
          };
          addMessage(searchingMessage);

          console.log('🔍 RAG: Starting document search for query:', userMessage.content);
          const ragResult = await ragService.search(userMessage.content);
          lastRAGQuery = ragResult;

          console.log(`🔍 RAG: Found ${ragResult.results.length} relevant chunks`);

          // Remove the searching message
          updateLastMessage('', undefined, true);

          if (ragResult.results.length > 0) {
            console.log(
              '🔍 RAG: Using context from documents:',
              ragResult.results.map((r) => r.document.fileName)
            );

            // Limit context to prevent exceeding token limits and deduplicate similar content
            const MAX_CONTEXT_CHARS = 2000; // Roughly 500 tokens
            let contextLength = 0;
            const contextChunks = [];
            const addedContent = new Set(); // Track content to avoid near-duplicates

            for (const result of ragResult.results) {
              const chunkContent = result.chunk.content;

              // Create a normalized version for duplicate detection (first 100 chars, lowercased)
              const contentKey = chunkContent.substring(0, 100).toLowerCase().replace(/\s+/g, ' ');

              // Skip if we've already added very similar content
              if (addedContent.has(contentKey)) {
                console.log('🔍 RAG: Skipping similar chunk to avoid repetition');
                continue;
              }

              if (contextLength + chunkContent.length > MAX_CONTEXT_CHARS) {
                // Add truncated chunk if we have room
                const remainingChars = MAX_CONTEXT_CHARS - contextLength;
                if (remainingChars > 100) {
                  contextChunks.push(
                    `[${result.document.fileName}] ${chunkContent.substring(0, remainingChars)}...`
                  );
                  addedContent.add(contentKey);
                }
                break;
              }
              contextChunks.push(`[${result.document.fileName}] ${chunkContent}`);
              contextLength += chunkContent.length;
              addedContent.add(contentKey);
            }

            const context = contextChunks.join('\n---\n'); // Use separator to make chunks distinct
            contextPrompt = `Context from documents:\n${context}\n\nUser question: ${userMessage.content}`;

            // Convert RAG results to format expected by ChatMessage component
            relevantChunks = ragResult.results.map((result) => ({
              content: result.chunk.content,
              metadata: {
                filename: result.document.fileName,
                similarity: result.similarity
              }
            }));

            // Check if user is asking for exact sentences
            const exactSentencePatterns = [
              /find.*sentence.*containing/i,
              /show.*exact.*sentence/i,
              /quote.*sentence.*with/i,
              /find.*where.*says/i,
              /exact.*quote.*about/i
            ];

            const isAskingForExactSentence = exactSentencePatterns.some((pattern) =>
              pattern.test(userMessage.content)
            );

            if (isAskingForExactSentence) {
              // Extract the search term from various patterns
              let searchTerm = '';
              const termMatch = userMessage.content.match(
                /(?:containing|with|about|where.*says about|quote.*about)\s+["']?([^"']+)["']?/i
              );
              if (termMatch) {
                searchTerm = termMatch[1].trim();
              }

              contextPrompt = `You have access to the following document content. The user is asking for EXACT sentences containing specific terms.\n\n${context}\n\n---\n\nUser question: ${userMessage.content}\n\nIMPORTANT: Find and quote the EXACT sentences from the document that contain "${searchTerm}". Quote them verbatim with quotation marks. If multiple sentences contain the term, list them all.\n\nAt the end of your response, add: "📚 Source: ${ragResult.results.map((r) => r.document.fileName).join(', ')}"`;
            } else {
              // Regular RAG response
              contextPrompt = `You have access to the following document content. Answer the user's question based ONLY on this information:\n\n${context}\n\n---\n\nUser question: ${userMessage.content}\n\nIMPORTANT: \n1. Answer directly based on the document content above\n2. Do NOT repeat the same information multiple times\n3. Do NOT quote the entire context back - only reference relevant parts\n4. Provide a concise, focused answer\n\nAt the end of your response, add: "📚 Source: ${ragResult.results.map((r) => r.document.fileName).join(', ')}"`;
            }
          } else {
            console.log('🔍 RAG: No relevant documents found');
            // When no RAG results, add a note to check if documents are uploaded
            contextPrompt = `${userMessage.content}\n\nNote: No relevant information was found in the uploaded documents. If you haven't uploaded any documents yet, please upload them first.`;
          }
        } catch (ragError) {
          console.warn('RAG search failed, falling back to legacy search:', ragError);

          // Remove the searching message on error
          updateLastMessage('', undefined, true);

          relevantChunks = await searchDocuments(userMessage.content);

          if (relevantChunks.length > 0) {
            // Limit context to prevent exceeding token limits
            const MAX_CONTEXT_CHARS = 2000; // Roughly 500 tokens
            let contextLength = 0;
            const contextChunks = [];

            for (const chunk of relevantChunks) {
              const chunkContent = chunk.content;
              if (contextLength + chunkContent.length > MAX_CONTEXT_CHARS) {
                // Add truncated chunk if we have room
                const remainingChars = MAX_CONTEXT_CHARS - contextLength;
                if (remainingChars > 100) {
                  contextChunks.push(
                    `[${chunk.metadata.filename}] ${chunkContent.substring(0, remainingChars)}...`
                  );
                }
                break;
              }
              contextChunks.push(`[${chunk.metadata.filename}] ${chunkContent}`);
              contextLength += chunkContent.length;
            }

            const context = contextChunks.join('\n\n');
            contextPrompt = `Context from documents:\n${context}\n\nUser question: ${userMessage.content}`;
          }
        }
      } else {
        console.log('🔍 RAG: Service not ready, using legacy document search');
        // Legacy document search
        relevantChunks = await searchDocuments(userMessage.content);

        if (relevantChunks.length > 0) {
          // Limit context to prevent exceeding token limits
          const MAX_CONTEXT_CHARS = 2000; // Roughly 500 tokens
          let contextLength = 0;
          const contextChunks = [];

          for (const chunk of relevantChunks) {
            const chunkContent = chunk.content;
            if (contextLength + chunkContent.length > MAX_CONTEXT_CHARS) {
              // Add truncated chunk if we have room
              const remainingChars = MAX_CONTEXT_CHARS - contextLength;
              if (remainingChars > 100) {
                contextChunks.push(
                  `[${chunk.metadata.filename}] ${chunkContent.substring(0, remainingChars)}...`
                );
              }
              break;
            }
            contextChunks.push(`[${chunk.metadata.filename}] ${chunkContent}`);
            contextLength += chunkContent.length;
          }

          const context = contextChunks.join('\n\n');
          contextPrompt = `Context from documents:\n${context}\n\nUser question: ${userMessage.content}`;
        }
      }

      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        chunks: relevantChunks,
        tokenCount: relevantChunks.length > 0 && lastRAGQuery ? lastRAGQuery.tokensUsed : undefined
      };

      addMessage(assistantMessage);

      // Start timing the response
      startResponseTiming();

      const messages = [
        ...$currentMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
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
      updateLastMessage(
        'Sorry, I encountered an error while processing your request. Please try again.',
        undefined,
        true
      );
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

  // File handling for drag-and-drop
  async function handleFilesDropped(event: CustomEvent<FileList>) {
    if (!featureManager.isEnabled('dragDropUpload')) return;

    const files = event.detail;
    uploadingFiles = true;

    try {
      let totalChunks = 0;
      let totalVectors = 0;
      const processedFiles = [];

      for (const file of Array.from(files)) {
        // Show processing status for each file
        const processingMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `📄 Processing ${file.name}... ${file.type === 'application/pdf' ? '(PDF)' : file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? '(DOCX)' : ''}`,
          timestamp: Date.now()
        };
        addMessage(processingMessage);
        
        try {
          const result = await handleFileUpload(file);
          
          // Remove processing message
          updateLastMessage('', undefined, true);
          
          if (result && result.chunks > 0) {
            totalChunks += result.chunks;
            totalVectors += result.vectors;
            processedFiles.push({
              name: file.name,
              chunks: result.chunks,
              examples: result.examples,
              documentType: result.documentType
            });
          } else {
            // Show error for files with no chunks
            const errorMessage: ChatMessageType = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `❌ Failed to process ${file.name}: No content could be extracted. The file may be empty, password-protected, or contain only images/non-text content.`,
              timestamp: Date.now()
            };
            addMessage(errorMessage);
          }
        } catch (fileError) {
          // Remove processing message
          updateLastMessage('', undefined, true);
          
          // Show specific error message
          const errorMessage: ChatMessageType = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `❌ ${fileError instanceof Error ? fileError.message : `Failed to process ${file.name}`}`,
            timestamp: Date.now()
          };
          addMessage(errorMessage);
        }
      }

      // Show detailed success message with examples only if we have processed files
      if (processedFiles.length > 0) {
        let successContent = `📄 Successfully processed ${processedFiles.length} document(s):\n\n`;

      processedFiles.forEach((file) => {
        const typeIcon = file.documentType === 'pdf' ? '📕' : file.documentType === 'docx' ? '📘' : '📄';
        successContent += `${typeIcon} **${file.name}** (${file.chunks} chunks)\n`;
        if (file.examples && file.examples.length > 0) {
          successContent += `Try asking:\n`;
          file.examples.forEach((example) => {
            successContent += `• "${example}"\n`;
          });
        }
        successContent += '\n';
      });

      if (totalChunks > 0) {
        successContent += `📊 **RAG Stats**: ${totalChunks} chunks created, ${totalVectors} vectors generated\n\n`;
        successContent += `💡 **How to use**: Ask questions about your documents - the AI will automatically search and use relevant content to answer!`;
      }

        const successMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: successContent,
          timestamp: Date.now()
        };
        addMessage(successMessage);
      }

      // Trigger RAG context refresh
      ragRefreshCounter++;
    } catch (error) {
      console.error('Error processing dropped files:', error);

      const errorMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
      addMessage(errorMessage);
    } finally {
      uploadingFiles = false;
    }
  }

  async function handleFileUpload(file: File): Promise<{
    chunks: number;
    vectors: number;
    examples: string[];
    documentType?: string;
  } | null> {
    if (featureManager.isEnabled('clientSideRAG')) {
      // Ensure RAG service is initialized
      if (!ragService.isReady()) {
        console.log('Initializing RAG service...');
        const { createEmbeddingProvider } = await import('$lib/services/embedding-service');
        const { createVectorStore } = await import('$lib/services/vector-store');

        const embeddingProvider = createEmbeddingProvider('tfidf');
        const vectorStore = createVectorStore('indexeddb');

        await ragService.initialize(embeddingProvider, vectorStore);
      }

      if (ragService.isReady()) {
        try {
          // Use RAG service
          await ragService.addDocument(file);

          // Get the processed document to extract information
          const documents = await ragService.getDocuments();
          const latestDoc = documents[documents.length - 1];

          if (latestDoc) {
            // Generate example questions based on document content
            const examples = generateExampleQuestions(latestDoc);

            return {
              chunks: latestDoc.metadata.totalChunks,
              vectors: latestDoc.chunks.filter((chunk) => chunk.embedding).length,
              examples,
              documentType: latestDoc.metadata.documentType || 'unknown'
            };
          }
        } catch (error) {
          console.error('Error processing document:', error);
          // Re-throw with a user-friendly message
          throw new Error(
            error instanceof Error ? error.message : 
            `Failed to process ${file.name}. The document may be empty, corrupted, or in an unsupported format.`
          );
        }
      }
    }

    // Fallback processing
    console.log('Processing file with legacy system or RAG unavailable:', file.name);
    return {
      chunks: 0,
      vectors: 0,
      examples: ['What does this document contain?', 'Summarize the main points']
    };
  }

  function generateExampleQuestions(document: any): string[] {
    const fileName = document.fileName.toLowerCase();
    const content = document.content.toLowerCase();

    const examples = [];

    // File type specific questions
    if (fileName.includes('readme') || fileName.includes('doc')) {
      examples.push('What is this project about?', 'How do I get started?');
    } else if (fileName.includes('api') || content.includes('endpoint')) {
      examples.push('What API endpoints are available?', 'How do I authenticate?');
    } else if (fileName.includes('config') || content.includes('configuration')) {
      examples.push('How do I configure this?', 'What settings are available?');
    } else if (content.includes('install') || content.includes('setup')) {
      examples.push('How do I install this?', 'What are the requirements?');
    } else if (content.includes('error') || content.includes('troubleshoot')) {
      examples.push('How do I fix common errors?', 'What troubleshooting steps are there?');
    }

    // Content-based questions
    if (content.includes('function') || content.includes('method')) {
      examples.push('What functions are available?');
    }
    if (content.includes('example') || content.includes('usage')) {
      examples.push('Show me some examples');
    }
    if (content.includes('feature')) {
      examples.push('What features does this have?');
    }

    // Generic fallbacks
    if (examples.length === 0) {
      examples.push(
        'What does this document explain?',
        'Summarize the key points',
        'What should I know about this?'
      );
    }

    return examples.slice(0, 3); // Return max 3 examples
  }

  function handleFileError(event: CustomEvent<string>) {
    const errorMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `❌ File upload error: ${event.detail}`,
      timestamp: Date.now()
    };
    addMessage(errorMessage);
  }

  function toggleRAGPanel() {
    showRAGPanel = !showRAGPanel;
  }

  async function findExactSentences(searchTerm: string) {
    if (!searchTerm) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '🔍 Please provide a search term. Usage: `/find [term]`',
        timestamp: Date.now()
      });
      return;
    }

    try {
      if (!ragService.isReady()) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '🔍 RAG service is not initialized. Upload a document first.',
          timestamp: Date.now()
        });
        return;
      }

      const documents = await ragService.getDocuments();
      if (documents.length === 0) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '🔍 No documents found. Please upload documents first.',
          timestamp: Date.now()
        });
        return;
      }

      console.log(`🔍 Searching for "${searchTerm}" in ${documents.length} documents`);

      // Search through all documents for sentences containing the term
      let foundSentences: { sentence: string; document: string; chunkIndex: number }[] = [];

      documents.forEach((doc) => {
        console.log(`🔍 Searching in document: ${doc.fileName} with ${doc.chunks.length} chunks`);
        doc.chunks.forEach((chunk, chunkIndex) => {
          // First check if the search term exists in the chunk
          if (!chunk.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            return; // Skip this chunk
          }
          console.log(`🔍 Found "${searchTerm}" in chunk ${chunkIndex}`);

          // Split by both sentence endings and line breaks to catch verse-formatted text
          // This handles biblical text that may be formatted with verse numbers
          const lines = chunk.content.split(/\n/);
          const sentences = chunk.content.match(/[^.!?]+[.!?]+/g) || [];

          // Combine both approaches and deduplicate
          const allSentences = [...new Set([...lines, ...sentences])]
            .filter((s) => s.trim().length > 0)
            .filter((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

          allSentences.forEach((sentence) => {
            foundSentences.push({
              sentence: sentence.trim(),
              document: doc.fileName,
              chunkIndex: chunkIndex
            });
          });
        });
      });

      if (foundSentences.length === 0) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `🔍 No sentences found containing "${searchTerm}".`,
          timestamp: Date.now()
        });
        return;
      }

      // Build response
      let response = `🔍 **Found ${foundSentences.length} sentence(s) containing "${searchTerm}":**\n\n`;

      foundSentences.forEach((result, index) => {
        response += `**${index + 1}. From ${result.document} (chunk ${result.chunkIndex + 1}):**\n`;
        // Highlight the search term
        const highlightedSentence = result.sentence.replace(
          new RegExp(`(${searchTerm})`, 'gi'),
          '**$1**'
        );
        response += `> ${highlightedSentence}\n\n`;
      });

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error searching for sentences: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      });
    }
  }

  async function showRAGDebugInfo() {
    try {
      if (!ragService.isReady()) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '🔍 RAG service is not initialized. Upload a document first.',
          timestamp: Date.now()
        });
        return;
      }

      const documents = await ragService.getDocuments();

      if (documents.length === 0) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '🔍 No documents found in RAG system. Upload some documents first.',
          timestamp: Date.now()
        });
        return;
      }

      let debugContent = '🔍 **RAG Debug Information**\n\n';

      documents.forEach((doc, index) => {
        debugContent += `**Document ${index + 1}: ${doc.fileName}**\n`;
        debugContent += `- ID: ${doc.id}\n`;
        debugContent += `- Chunks: ${doc.chunks.length}\n`;
        debugContent += `- Total tokens: ${doc.metadata.totalTokens}\n`;
        debugContent += `- Processing: ${doc.metadata.processingStatus}\n`;
        debugContent += `- Embeddings: ${doc.metadata.embeddingStatus}\n`;

        if (doc.chunks.length > 0) {
          debugContent += `- First chunk preview: "${doc.chunks[0].content.substring(0, 100)}..."\n`;
          debugContent += `- Has embeddings: ${doc.chunks[0].embedding ? 'Yes' : 'No'}\n`;
        }
        debugContent += '\n';
      });

      // Test search functionality
      debugContent += '**Testing search with "test" query:**\n';
      try {
        const searchResult = await ragService.search('test', 3);
        debugContent += `- Found ${searchResult.results.length} results\n`;
        debugContent += `- Context tokens: ${Math.round(searchResult.tokensUsed)}\n`;

        if (searchResult.results.length > 0) {
          debugContent += `- Best match: "${searchResult.results[0].chunk.content.substring(0, 80)}..."\n`;
          debugContent += `- Similarity: ${Math.round(searchResult.results[0].similarity * 100)}%\n`;
        }
      } catch (searchError) {
        debugContent += `- Search error: ${searchError}\n`;
      }

      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: debugContent,
        timestamp: Date.now()
      });
    } catch (error) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `🔍 RAG Debug Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      });
    }
  }

  function handleFileButtonClick() {
    if (featureManager.isEnabled('dragDropUpload')) {
      fileInput.click();
    }
  }

  async function handleFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (files && files.length > 0) {
      const fileList = Array.from(files);
      uploadingFiles = true;

      try {
        let totalChunks = 0;
        let totalVectors = 0;
        const processedFiles = [];

        for (const file of fileList) {
          // Show processing status for each file
          const processingMessage: ChatMessageType = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `📄 Processing ${file.name}... ${file.type === 'application/pdf' ? '(PDF)' : file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? '(DOCX)' : ''}`,
            timestamp: Date.now()
          };
          addMessage(processingMessage);
          
          try {
            const result = await handleFileUpload(file);
            
            // Remove processing message
            updateLastMessage('', undefined, true);
            
            if (result && result.chunks > 0) {
              totalChunks += result.chunks;
              totalVectors += result.vectors;
              processedFiles.push({
                name: file.name,
                chunks: result.chunks,
                examples: result.examples,
                documentType: result.documentType
              });
            } else {
              // Show error for files with no chunks
              const errorMessage: ChatMessageType = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `❌ Failed to process ${file.name}: No content could be extracted. The file may be empty, password-protected, or contain only images/non-text content.`,
                timestamp: Date.now()
              };
              addMessage(errorMessage);
            }
          } catch (fileError) {
            // Remove processing message
            updateLastMessage('', undefined, true);
            
            // Show specific error message
            const errorMessage: ChatMessageType = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `❌ ${fileError instanceof Error ? fileError.message : `Failed to process ${file.name}`}`,
              timestamp: Date.now()
            };
            addMessage(errorMessage);
          }
        }

        // Show detailed success message with examples only if we have processed files
        if (processedFiles.length > 0) {
          let successContent = `📄 Successfully processed ${processedFiles.length} document(s):\n\n`;

        processedFiles.forEach((file) => {
          const typeIcon = file.documentType === 'pdf' ? '📕' : file.documentType === 'docx' ? '📘' : '📄';
          successContent += `${typeIcon} **${file.name}** (${file.chunks} chunks)\n`;
          if (file.examples && file.examples.length > 0) {
            successContent += `Try asking:\n`;
            file.examples.forEach((example) => {
              successContent += `• "${example}"\n`;
            });
          }
          successContent += '\n';
        });

          if (totalChunks > 0) {
            successContent += `📊 **RAG Stats**: ${totalChunks} chunks created, ${totalVectors} vectors generated\n\n`;
            successContent += `💡 **How to use**: Ask questions about your documents - the AI will automatically search and use relevant content to answer!`;
          }

          const successMessage: ChatMessageType = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: successContent,
            timestamp: Date.now()
          };
          addMessage(successMessage);
        }

        // Trigger RAG context refresh
        ragRefreshCounter++;
      } catch (error) {
        console.error('Error processing uploaded files:', error);

        const errorMessage: ChatMessageType = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `❌ Error processing files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: Date.now()
        };
        addMessage(errorMessage);
      } finally {
        uploadingFiles = false;
        // Clear the input so the same file can be selected again
        input.value = '';
      }
    }
  }

  $: {
    scrollToBottom();
  }
</script>

<div class="relative h-full overflow-hidden flex">
  <!-- Progress bar - positioned absolutely at top -->
  {#if !$isModelLoaded && $modelLoadingProgress < 100}
    <div
      class="absolute top-0 left-0 right-0 z-20 p-4 bg-surface-100-800-token border-b border-surface-300-600-token"
    >
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-surface-700-200-token"
          >Loading Model: {$currentModel}</span
        >
        <span class="text-sm text-surface-700-200-token opacity-70">{$modelLoadingProgress}%</span>
      </div>
      <ProgressBar value={$modelLoadingProgress} max={100} class="mb-2" />
      <p class="text-xs text-surface-700-200-token opacity-70">{$modelLoadingStatus}</p>
    </div>
  {/if}

  <!-- Main chat area -->
  <div class="flex-1 relative">
    <!-- Chat messages with drag-and-drop -->
    <DragDropZone className="h-full" on:files={handleFilesDropped} on:error={handleFileError}>
      <div
        bind:this={chatContainer}
        class="absolute inset-0 overflow-y-auto p-4 space-y-4 scroll-smooth"
        class:pt-24={!$isModelLoaded && $modelLoadingProgress < 100}
        style="padding-bottom: 10rem; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;"
        on:scroll={handleScroll}
      >
        {#if $currentMessages.length === 0}
          <div class="text-center text-surface-700-200-token opacity-80 mt-8">
            <div class="text-6xl mb-4">💬</div>
            <h2 class="h3 mb-2 text-surface-700-200-token">Welcome to WebLLM Chat</h2>
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
              <div class="flex items-center space-x-2 text-surface-700-200-token">
                <div class="animate-pulse">💭</div>
                <span>Thinking...</span>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </DragDropZone>

    <!-- Gradient fade for smooth scroll under effect -->
    <div
      class="absolute bottom-20 left-0 right-0 h-24 bg-gradient-to-t from-surface-100/50 dark:from-surface-800/50 to-transparent pointer-events-none z-40"
    ></div>

    <!-- Input area -->
    <div
      class="absolute bottom-0 left-0 right-0 bg-surface-100-800-token border-t border-surface-300-600-token p-4 z-50"
    >
      <div class="relative max-w-4xl mx-auto">
        <div
          class="flex items-end gap-2 p-2 bg-surface-200-700-token rounded-full ring-2 ring-surface-300-600-token hover:ring-primary-500 focus-within:ring-primary-500 transition-all duration-200 shadow-sm"
        >
          <button
            class="btn-icon btn-icon-sm variant-soft-surface ml-1"
            disabled={uploadingFiles}
            aria-label="Upload documents"
            on:click={handleFileButtonClick}
          >
            {#if uploadingFiles}
              <i class="fa fa-spinner fa-spin"></i>
            {:else}
              <i class="fa fa-paperclip"></i>
            {/if}
          </button>
          <textarea
            id="message-input"
            bind:value={messageInput}
            on:keydown={handleKeydown}
            placeholder={$isModelLoaded
              ? 'Write a message...'
              : 'Model loading... You can type but wait to send'}
            disabled={isSubmitting || $isTyping}
            class="flex-1 bg-transparent border-0 ring-0 resize-none px-2 py-1.5 leading-normal min-h-[2.5rem] max-h-32"
            rows="1"
            style="field-sizing: content;"
          ></textarea>
          <button
            on:click={handleSubmit}
            disabled={!messageInput.trim() || isSubmitting || $isTyping}
            class="btn-icon btn-icon-sm variant-filled-primary mr-1"
          >
            {#if isSubmitting || $isTyping}
              <i class="fa fa-spinner fa-spin"></i>
            {:else}
              <i class="fa fa-arrow-up"></i>
            {/if}
          </button>
        </div>

        <!-- Hidden file input for upload button -->
        <input
          bind:this={fileInput}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.docx"
          on:change={handleFileInputChange}
          style="display: none;"
        />
      </div>

      {#if !$isModelLoaded && $modelLoadingProgress < 100}
        <div class="text-xs text-surface-700-200-token opacity-70 mt-2">
          Model is loading ({$modelLoadingProgress}%)... Messages will queue until ready.
        </div>
      {/if}
    </div>
  </div>

  <!-- RAG Context Panel -->
  <RAGContext
    bind:isVisible={showRAGPanel}
    bind:lastQuery={lastRAGQuery}
    forceRefresh={ragRefreshCounter}
  />
</div>

<!-- RAG Toggle Button -->
{#if featureManager.isEnabled('clientSideRAG')}
  <button
    class="fixed bottom-24 right-4 btn-icon btn-icon-lg variant-filled-primary shadow-lg z-50"
    class:variant-filled-secondary={showRAGPanel}
    on:click={toggleRAGPanel}
    aria-label="Toggle RAG panel"
  >
    <i class="fa fa-brain"></i>
  </button>
{/if}

<!-- Upload Status Overlay -->
{#if uploadingFiles}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
    <div class="bg-surface-100-800-token rounded-lg p-6 flex items-center space-x-3">
      <i class="fa fa-spinner fa-spin text-xl"></i>
      <span>Processing documents...</span>
    </div>
  </div>
{/if}

<!-- Feature Toggle Modal -->
<FeatureToggle bind:isVisible={showFeatureToggle} />

<!-- Developer Toggle Button (for easy access during development) -->
<button
  class="fixed top-4 right-4 btn-icon btn-icon-sm variant-soft-surface opacity-50 hover:opacity-100 z-40"
  on:click={() => (showFeatureToggle = true)}
  aria-label="Toggle experimental features (Ctrl+Shift+F)"
  title="Experimental Features (Ctrl+Shift+F)"
>
  <i class="fa fa-flask text-xs"></i>
</button>
