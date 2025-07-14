# WebLLM Chat

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
│   ├── components/     # Svelte components
│   ├── stores/         # Svelte stores for state management
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── routes/             # SvelteKit routes
└── app.html           # Main HTML template

tests/
├── unit/              # Unit tests
└── integration/       # Playwright integration tests
\`\`\`

## Usage

1. **First Launch**: The app automatically loads a small 1B parameter model for immediate use
2. **Model Management**: Click "Models" to download larger, more capable models
3. **Chat**: Type messages in the input field and press Enter to send
4. **Document Upload**: Click "Documents" to upload files for RAG functionality
5. **Theme Switching**: Use the theme picker to change the visual style
6. **Chat History**: Previous conversations are automatically saved and can be restored

## RAG (Document Search)

The app includes a built-in RAG system that:

- Processes uploaded documents into searchable chunks
- Automatically searches relevant content for each user query
- Includes source citations in AI responses
- Supports multiple document formats

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