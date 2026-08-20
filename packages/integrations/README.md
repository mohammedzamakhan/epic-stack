# @repo/integrations

A comprehensive third-party service integration framework for the monorepo. This
package provides OAuth management, token encryption, provider implementations,
and event-driven notification systems.

## Features

- **OAuth Flow Management**: Complete OAuth 2.0 flow handling with state
  management and CSRF protection
- **Token Security**: AES-256-GCM encryption for secure token storage
- **Provider System**: Extensible provider architecture with built-in Slack
  support
- **Event System**: Generic entity change notification system
- **Dependency Injection**: Configurable repository pattern for database
  operations
- **TypeScript Support**: Full TypeScript support with comprehensive type
  definitions

## Installation

```bash
npm install @repo/integrations
```

## Quick Start

```typescript
import { integrationManager } from '@repo/integrations'

// Start OAuth flow
const { authUrl, state } = await integrationManager.initiateOAuth(
	organizationId,
	'slack',
	redirectUri,
)
```

## Documentation

Detailed documentation will be available once the package implementation is
complete.

## Development

```bash
# Build the package
npm run build

# Run tests
npm run test

# Type checking
npm run typecheck

# Development mode with watch
npm run dev
```

## License

This package is part of the monorepo and follows the same license terms.
