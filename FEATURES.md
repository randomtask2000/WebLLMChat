# WebLLM Chat - Feature List

A comprehensive, privacy-focused AI assistant that runs entirely in your browser.

## 🚀 Core Features

### In-Browser LLM Inference
- Runs large language models directly in the browser using WebGPU
- No server required - everything runs client-side
- Works offline after initial model download
- WebGPU hardware acceleration for fast performance

### Multiple AI Models
- **Llama-3.2-3B-Instruct (Context7)** - Default model with 128k context (2GB VRAM)
- **TinyLlama-1.1B** - Fastest loading, minimal VRAM (512MB, 2k context)
- **Llama-3.2-1B-Instruct** - Small model with 128k context (1GB VRAM)
- **Llama-3.2-3B-Instruct** - Standard 128k context version (2GB VRAM)
- **Llama-3.1-8B-Instruct** - Highest quality responses (5GB VRAM, 128k context)
- **Qwen2.5-7B-Instruct** - Excellent coding capabilities (4GB VRAM, 128k context)
- **Phi-3.5-mini-instruct** - Microsoft's efficient model (2GB VRAM, 128k context)

## 📄 Document Analysis (RAG)

### Supported File Types
- **PDF** - Full text extraction with metadata
- **DOCX** - Word documents with structure preservation
- **TXT** - Plain text files
- **MD** - Markdown files
- **CSV** - Structured data

### RAG Features
- Client-side document processing for privacy
- Smart document chunking with configurable settings
- TF-IDF embeddings for semantic search
- Vector storage using IndexedDB
- Hybrid keyword + semantic search
- Real-time document search during conversations
- Drag-and-drop file upload
- Multiple document support

### RAG Configuration
- **Chunk Size**: 50-1000 tokens (adjustable)
- **Overlap Size**: 0-200 tokens (adjustable)
- **Search Accuracy**: 0-100% scale
  - Low (0-30%): Fuzzy matching
  - Medium (40-60%): Balanced approach
  - High (70-100%): Exact matching only

## 💬 Chat Interface

### Chat Features
- Real-time streaming responses
- Syntax highlighting for code blocks
- Markdown rendering
- Token count display
- Message timestamps
- Chat history persistence
- Multiple chat sessions
- Clear chat functionality
- Copy message content

### Advanced Commands
- `/help` - Show all available commands
- `/find [term]` - Find exact sentences containing a term
- `/chunks` - Show all RAG chunks in order
- `/debug rag` - Show RAG system information
- `/clear` - Clear current chat
- `/new` - Start new chat session

## 🎨 UI/UX Features

### Themes & Customization
- Multiple theme support (Skeleton, Wintry, Modern, Crimson)
- Dark/light mode switching
- Responsive design for desktop and mobile
- Configurable app title (via `app.config.json`)

### User Experience
- Welcome guide for new users
- Loading progress indicators
- Error handling and user feedback
- Collapsible sidebar
- RAG context panel
- Mobile-optimized layout

## ⚙️ Configuration

### Feature Toggles
- `dragDropUpload` - Enable/disable drag-drop file upload
- `clientSideRAG` - Enable/disable RAG functionality
- `documentEmbeddings` - Enable/disable document embeddings
- `vectorSearch` - Enable/disable vector search
- `ragContextDisplay` - Show/hide RAG context in responses

### Storage & Persistence
- Chat history saved in localStorage
- Documents and embeddings stored in IndexedDB
- Model cache in browser cache
- Feature flags persistence
- RAG settings persistence
- Theme preferences saved

## 🔒 Privacy & Security
- 100% client-side processing
- No data sent to servers
- All conversations stay private
- Documents processed locally
- Works completely offline after setup

## 📱 Platform Support

### Browser Compatibility
- Chrome/Chromium 113+
- Edge 113+
- Safari 16.4+ (experimental)
- Firefox (behind flags)
- WebGPU support required

### Mobile Support
- Responsive mobile layout
- Touch-friendly interface
- Capacitor framework for native apps
- iOS platform support
- Progressive Web App (PWA) ready

## 🛠️ Developer Features
- TypeScript support throughout
- Comprehensive test suite (Vitest + Playwright)
- ESLint and Prettier configuration
- Hot module replacement (HMR)
- Source maps for debugging
- Console logging for RAG operations

## 📊 Performance Features
- Model caching after first download
- Lazy loading of components
- Web Worker support for background processing
- Efficient vector search algorithms
- Streaming response generation

## 📋 Visual Indicators
- Token badge on messages using RAG
- Search status during document search
- Source citations in responses
- Processing status for file uploads
- Model loading progress
- File type icons (📕 PDF, 📘 DOCX, 📄 Text)

## 🚀 Getting Started

1. Visit the application in a WebGPU-enabled browser
2. Select an AI model based on your device capabilities
3. Start chatting or upload documents for analysis
4. Use advanced commands for enhanced functionality
5. Customize themes and settings to your preference

All processing happens locally in your browser - your data never leaves your device!