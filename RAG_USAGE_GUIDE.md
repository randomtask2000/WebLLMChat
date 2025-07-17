# RAG Usage Guide

## How to Ensure RAG Documents Are Being Used

### 1. Visual Indicators

The system provides several visual cues when RAG is active:

- **Token Badge**: Assistant messages show token count when RAG context is used
- **[RAG Context Used]**: This prefix appears in messages when documents are accessed
- **Search Status**: "🔍 Searching through X documents..." appears during search
- **Source Attribution**: Responses end with "📚 Sources: [filenames]" when using RAG

### 2. Console Monitoring

Open browser DevTools (F12) to see detailed RAG activity:

```
🔍 RAG: Starting document search for query: who is [term]
🔍 RAG: Query embedding generated, dimensions: 512
🔍 RAG: Searching vector store with topK: 3 threshold: 0.5
🔍 RAG: Vector store returned 2 results
🔍 RAG: Best result similarity: 0.823
```

### 3. Debug Commands

Type `/debug rag` in chat to see:

- Number of indexed documents
- Total chunks and embeddings
- Storage statistics

### 4. Effective Query Strategies

#### ❌ Poor Queries (May Use LLM Knowledge)

- "Who is [term]?"
- "What is JavaScript?"
- "Explain machine learning"

#### ✅ Good Queries (Forces Document Usage)

- "According to the document, who is [term]?"
- "What does the uploaded file say about [term]?"
- "Find information about Widger in the text"
- "Quote the section about [specific topic] from the document"

### 5. Configuration Tips

#### Search Accuracy Slider

- **0-30%**: Very fuzzy matching, catches more content
- **40-60%**: Balanced accuracy (recommended)
- **70-100%**: Exact matching only

#### Chunk Size

- **Smaller chunks (50-200)**: Better for finding specific facts
- **Larger chunks (300-500)**: Better for context and themes

### 6. Troubleshooting

#### No Results Found?

1. Check if documents are uploaded (RAG Context panel)
2. Lower the search accuracy
3. Try different keywords
4. Use the exact terms from the document

#### Getting LLM Answers Instead of Document Content?

1. The system now forces document-only answers when RAG finds results
2. If no results found, it will tell you explicitly
3. Use more specific queries with document terms

#### Want to Verify RAG is Working?

1. Upload a document with unique information
2. Ask about that specific information
3. Check for source attribution at end of response
4. Open RAG Context panel to see search results

### 7. Example Usage Flow

1. **Upload Document**: Drag and drop or use + button
2. **Wait for Processing**: Check RAG Context panel shows document
3. **Ask Specific Question**: "What does the document say about [topic]?"
4. **Verify Response**: Look for source attribution and token count
5. **Adjust if Needed**: Use accuracy slider if results are too broad/narrow

### 8. Advanced Features

- **Multiple Documents**: RAG searches across all uploaded documents
- **Keyword + Semantic**: System uses hybrid search for better results
- **Context Limiting**: Automatically limits context to prevent token overflow
- **Persistent Storage**: Documents remain indexed even after page refresh
