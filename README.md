# WebLLM Chat

🌐 **[Live Demo: https://randomtask2000.github.io/WebLLMChat/](https://randomtask2000.github.io/WebLLMChat/)**

A modern chat application built with SvelteKit and WebLLM that runs entirely in the browser without requiring a backend server. Features include RAG (Retrieval-Augmented Generation) capabilities, multiple theme support, and persistent chat history.

## Features

- 🤖 **WebLLM Integration**: Run large language models directly in the browser
- 📄 **RAG Support**: Upload and search through documents (PDF, TXT, MD, CSV)
- 🎨 **Multiple Themes**: Switch between Skeleton, Wintry, Modern, and Crimson themes
- 💬 **Chat History**: Persistent chat sessions stored in browser localStorage
- 🔄 **Model Management**: Download and switch between different LLM models
- ⚡ **Responsive Design**: Works on desktop and mobile devices
- 🧪 **Fully Tested**: Comprehensive unit and integration tests
- 📱 **PWA Ready**: Can be installed as a Progressive Web App

## Available Models

- **Llama-3.2-3B-Instruct (Context7)**: Default model with extended 128k context (2GB VRAM)
- **TinyLlama-1.1B**: Fastest loading, minimal VRAM (512MB, 2k context)
- **Llama-3.2-1B-Instruct**: Small model with 128k context (1GB VRAM)
- **Llama-3.2-3B-Instruct**: Standard 128k context version (2GB VRAM)
- **Llama-3.1-8B-Instruct**: Highest quality responses (5GB VRAM, 128k context)
- **Qwen2.5-7B-Instruct**: Excellent coding capabilities (4GB VRAM, 128k context)
- **Phi-3.5-mini-instruct**: Microsoft's efficient model (2GB VRAM, 128k context)

## Technology Stack

- **Framework**: SvelteKit with TypeScript
- **Styling**: TailwindCSS with Skeleton UI components
- **LLM Engine**: WebLLM (runs models in browser via WebGPU)
- **Document Processing**: PDF.js for PDF parsing
- **Testing**: Vitest for unit tests, Playwright for integration tests
- **Build**: Vite for fast development and optimized production builds

## Development

### Prerequisites

- Node.js 18+
- Modern browser with WebGPU support (Chrome 113+, Edge 113+)

### Setup

\`\`\`bash

# Install dependencies

npm install

# Start development server

npm run dev

# Run tests

npm run test

# Run integration tests

npm run test:integration

# Type checking

npm run check

# Build for production

npm run build

# Preview production build

npm run preview
\`\`\`

### Project Structure

\`\`\`
src/
├── lib/
│ ├── components/ # Svelte components
│ ├── stores/ # Svelte stores for state management
│ ├── types/ # TypeScript type definitions
│ └── utils/ # Utility functions
├── routes/ # SvelteKit routes
└── app.html # Main HTML template

tests/
├── unit/ # Unit tests
└── integration/ # Playwright integration tests
\`\`\`

## Usage

1. **First Launch**: The app automatically loads a small 1B parameter model for immediate use
2. **Model Management**: Click "Models" to download larger, more capable models
3. **Chat**: Type messages in the input field and press Enter to send
4. **Document Upload**: Click "Documents" to upload files for RAG functionality
5. **Theme Switching**: Use the theme picker to change the visual style
6. **Chat History**: Previous conversations are automatically saved and can be restored

## RAG (Retrieval-Augmented Generation)

The app includes a powerful client-side RAG system that enhances AI responses with your uploaded documents. 

### Supported Document Formats
- 📕 **PDF files** - Full text extraction with metadata (title, author, page count)
- 📘 **Word documents (.docx)** - Preserves document structure (headings, lists, paragraphs)
- 📝 **Text files (.txt)** - Plain text processing
- 📋 **Markdown files (.md)** - Markdown content processing

### How to Use RAG

1. **Upload Documents**:
   - Click the **+ button** in the chat input area, or
   - **Drag and drop** files directly into the chat area
   - Use the **📁 Documents** button in the top bar

2. **Ask Questions**: The AI will automatically search your documents and use relevant content to answer

3. **View RAG Context**: Click the **RAG Context** button (right sidebar) to see:
   - Uploaded documents with chunk counts
   - Search results from your last query
   - RAG settings and configuration

### RAG Settings

Access settings in the RAG Context panel:

- **Chunk Size** (50-1000 tokens): Smaller chunks find specific facts better
- **Overlap Size** (0-200 tokens): Overlap between chunks for better context
- **Search Accuracy** (0-100%): 
  - Low (0-30%): Fuzzy matching, more results
  - Medium (40-60%): Balanced approach
  - High (70-100%): Exact matching only

### Advanced RAG Commands

Use the `/find` command to search for exact sentences:

```
/find tree
/find [term]
/find any term
```

Or use natural language:
- "Find sentences containing [term]"
- "Show me the exact sentence with [term]"
- "Quote the sentence about Jacob"
- "Find where it says about Lehi"

### Visual Indicators

- **Token Badge**: Shows when RAG context is used in responses
- **Source Citations**: Responses end with "📚 Source: [filename]"
- **Search Status**: "🔍 Searching through X documents..." appears during search
- **Processing Status**: Shows file type icons (📕 PDF, 📘 DOCX, 📄 Text) during upload

### Advanced Features

- **Smart Chunking**: Documents are intelligently split preserving structure (headings, paragraphs)
- **Metadata Extraction**: PDFs extract title, author, page count automatically
- **Structure Preservation**: DOCX files maintain heading hierarchy and lists
- **Page Tracking**: PDF chunks remember their source page numbers

For more detailed RAG usage instructions, see [RAG_USAGE_GUIDE.md](RAG_USAGE_GUIDE.md)

## Browser Compatibility

Requires a modern browser with WebGPU support:

- Chrome/Chromium 113+
- Edge 113+
- Safari 16.4+ (experimental)
- Firefox (behind flags)

## Performance Notes

- First model load may take 1-5 minutes depending on internet speed
- Models are cached locally after first download
- Larger models provide better quality but require more VRAM
- The app continues working offline after initial model download

## License

MIT License - feel free to use this project as a starting point for your own applications.
