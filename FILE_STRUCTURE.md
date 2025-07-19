# WebLLM Chat - File Structure

## Project Root
```
webllm-app/
├── src/                          # Source code directory
│   ├── app.css                   # Global styles
│   ├── app.html                  # HTML template
│   ├── lib/                      # Library/shared code
│   │   ├── components/           # Svelte components
│   │   │   ├── ChatInterface.svelte      # Main chat UI component
│   │   │   ├── ChatMessage.svelte        # Individual message component
│   │   │   ├── DocumentBrowser.svelte    # Document browsing UI
│   │   │   ├── DocumentManager.svelte    # Document management modal
│   │   │   ├── DragDropZone.svelte       # Drag-and-drop upload zone
│   │   │   ├── FeatureToggle.svelte      # Feature toggle switches
│   │   │   ├── FileUpload.svelte         # File upload component
│   │   │   ├── MobileLayout.svelte       # Mobile-specific layout
│   │   │   ├── ModelDropdown.svelte      # Model selection dropdown
│   │   │   ├── ModelManager.svelte       # Model management UI
│   │   │   ├── RAGContext.svelte         # RAG context display
│   │   │   ├── Sidebar.svelte            # Sidebar navigation
│   │   │   ├── ThemeSwitcher.svelte      # Theme selection component
│   │   │   ├── TokenCounter.svelte       # Token counting display
│   │   │   └── WelcomeGuide.svelte       # Welcome guide modal
│   │   ├── config/               # Configuration files
│   │   │   ├── app.config.ts             # App configuration (title, etc.)
│   │   │   └── features.ts               # Feature flags configuration
│   │   ├── services/             # Service layer
│   │   │   ├── document-storage.ts       # Document storage service
│   │   │   ├── embedding-service.ts      # TF-IDF embedding generation
│   │   │   ├── rag-service.ts            # RAG orchestration service
│   │   │   └── vector-store.ts           # Vector storage and search
│   │   ├── stores/               # Svelte stores (state management)
│   │   │   ├── chat.ts                   # Chat messages and history
│   │   │   ├── documents.ts              # Document management store
│   │   │   ├── models.ts                 # AI model management
│   │   │   └── theme.ts                  # Theme preferences
│   │   ├── styles/               # Additional styles
│   │   │   └── glass.css                 # Glass morphism styles
│   │   ├── types/                # TypeScript type definitions
│   │   │   ├── index.ts                  # General types
│   │   │   └── rag.ts                    # RAG-specific types
│   │   └── utils/                # Utility functions
│   │       ├── document-processor.ts     # Document parsing utilities
│   │       ├── mobile.ts                 # Mobile detection utilities
│   │       ├── model-loading.ts          # Model loading helpers
│   │       ├── timeFormat.ts             # Time formatting utilities
│   │       ├── tokenCount.ts             # Token counting utilities
│   │       └── webllm.ts                 # WebLLM integration
│   └── routes/                   # SvelteKit routes
│       ├── +layout.svelte               # Root layout component
│       ├── +layout.ts                   # Layout load function
│       └── +page.svelte                 # Main page component
├── static/                       # Static assets
│   ├── favicon.ico                      # App favicon
│   └── manifest.json                    # PWA manifest
├── tests/                        # Test files
│   ├── integration/                     # Integration tests
│   │   └── chat-flow.test.ts           # Chat flow integration tests
│   └── unit/                           # Unit tests
│       ├── document-processor.test.ts   # Document processor tests
│       ├── document-processor-advanced.test.ts
│       └── stores.test.ts              # Store tests
├── ios/                          # iOS native app (Capacitor)
│   └── App/                            # iOS app directory
├── build/                        # Production build output
├── .svelte-kit/                  # SvelteKit generated files
├── node_modules/                 # NPM dependencies
├── app.config.json               # App configuration (title, etc.)
├── capacitor.config.ts           # Capacitor configuration
├── eslint.config.js              # ESLint configuration
├── package.json                  # NPM package configuration
├── package-lock.json             # NPM lock file
├── playwright.config.ts          # Playwright test configuration
├── postcss.config.js             # PostCSS configuration
├── svelte.config.js              # SvelteKit configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite bundler configuration
├── vitest.config.ts              # Vitest test configuration
├── README.md                     # Project documentation
├── FEATURES.md                   # Comprehensive feature list
├── RAG_USAGE_GUIDE.md           # RAG system usage guide
├── MOBILE_SETUP.md              # Mobile app setup instructions
├── APP_CONFIG.md                # App configuration guide
└── FILE_STRUCTURE.md            # This file
```

## Key Directories Explained

### `/src/lib/components/`
Contains all Svelte components that make up the UI. Each component is self-contained with its own logic and styling.

### `/src/lib/services/`
Service layer that handles business logic:
- **document-storage.ts**: Manages document persistence in IndexedDB
- **embedding-service.ts**: Generates TF-IDF embeddings for documents
- **rag-service.ts**: Orchestrates the RAG pipeline
- **vector-store.ts**: Handles vector storage and similarity search

### `/src/lib/stores/`
Svelte stores for state management:
- **chat.ts**: Manages chat messages, history, and active conversations
- **documents.ts**: Handles uploaded documents and their metadata
- **models.ts**: Manages AI model selection and loading state
- **theme.ts**: Persists theme preferences

### `/src/lib/utils/`
Utility functions:
- **document-processor.ts**: Parses various document formats (PDF, DOCX, etc.)
- **webllm.ts**: Integrates with the WebLLM library for in-browser inference
- **model-loading.ts**: Handles model downloading and initialization

### `/src/routes/`
SvelteKit routing structure:
- **+layout.svelte**: Root layout with global initialization
- **+page.svelte**: Main application page

### `/static/`
Static assets served directly:
- **manifest.json**: PWA configuration
- **favicon.ico**: Application icon

### Configuration Files
- **app.config.json**: User-configurable settings (app title, etc.)
- **capacitor.config.ts**: Native mobile app configuration
- **vite.config.ts**: Build tool configuration
- **tailwind.config.ts**: CSS framework configuration
- **tsconfig.json**: TypeScript compiler options

## File Naming Conventions
- Components: PascalCase (e.g., `ChatInterface.svelte`)
- Utilities/Services: kebab-case (e.g., `document-processor.ts`)
- Stores: camelCase (e.g., `chat.ts`)
- Config files: lowercase with appropriate extension

## Build Output
- `/build/`: Production-ready static files
- `/.svelte-kit/`: SvelteKit generated files (gitignored)
- `/node_modules/`: Dependencies (gitignored)