# @repo/ai

AI functionality package for the Epic Stack monorepo. This package abstracts all AI-related code (server utilities and UI components) for reuse across the application.

## Features

### Server Utilities

- **Chat Streaming**: `createChatStream()` - Create streaming AI chat responses with Google's Gemini
- **Content Generation**: `generateNoteContent()` - Generate markdown content from titles
- **Prompt Building**: `buildNoteChatSystemPrompt()` - Build context-aware system prompts

### UI Components

- **AIChat**: Full-featured chat interface with smart suggestions
- **AIContentGenerator**: Button component for triggering content generation
- **AI Elements**: 16 reusable UI components for AI interactions:
  - `Response` - Markdown rendering with syntax highlighting
  - `Message` - Chat message display
  - `PromptInput` - Chat input with keyboard shortcuts
  - `Conversation` - Chat history container
  - `Suggestions` - Smart suggestion pills
  - `CodeBlock` - Syntax-highlighted code display
  - `Loader` - Loading indicators
  - And more...

## Installation

This package is automatically available in the monorepo workspace:

```typescript
import { createChatStream, AIChat } from '@repo/ai'
```

## Usage

### Server-Side

```typescript
import { createChatStream, buildNoteChatSystemPrompt } from '@repo/ai'
import { brand } from '@repo/config/brand'

// Build prompt with context
const systemPrompt = buildNoteChatSystemPrompt(brand.ai.systemPrompt, {
  title: 'My Note',
  content: 'Note content...',
  wordCount: 100,
  hasComments: true,
  commentCount: 5,
  comments: [
    { content: 'Great note!', userName: 'John' }
  ]
})

// Create streaming response
const result = createChatStream({
  messages: [{ role: 'user', content: 'Summarize this' }],
  systemPrompt,
})

return result.toDataStreamResponse()
```

### Client-Side

```typescript
import { AIChat } from '@repo/ai'

function MyComponent() {
  return <AIChat noteId="note-123" />
}
```

## Dependencies

- `@ai-sdk/google` - Google Generative AI provider
- `@ai-sdk/react` - React hooks for AI
- `ai` - Vercel AI SDK
- `react-markdown` - Markdown rendering
- `@repo/ui` - Shared UI components

## Development

```bash
# Type check
npm run typecheck

# Run tests
npm test

# Build
npm run build
```

## Architecture

```
@repo/ai/
├── src/
│   ├── server/           # Server-side utilities
│   │   ├── chat.ts       # Streaming chat
│   │   ├── generate.ts   # Content generation
│   │   └── prompts.ts    # Prompt builders
│   ├── components/       # React components
│   │   ├── ai-chat.tsx
│   │   ├── ai-content-generator.tsx
│   │   └── ai-elements/  # Reusable UI elements
│   └── utils/            # Shared utilities
├── index.ts              # Package exports
├── package.json
└── tsconfig.json
```

## Integration

The package is integrated into the app via Vite configuration:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@repo/ai': path.resolve(__dirname, '../../packages/ai'),
    },
  },
  optimizeDeps: {
    include: ['@repo/ai', ...],
  },
  ssr: {
    noExternal: ['@repo/ai', ...],
  },
})
```

## License

MIT
