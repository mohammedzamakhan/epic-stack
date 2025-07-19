# Integration System Core Types and Interfaces

This directory contains the core types, interfaces, and base implementations for the third-party integration system.

## Overview

The integration system provides a flexible, extensible architecture for connecting organization notes with external services like Slack, Microsoft Teams, Jira, and other productivity tools.

## Core Components

### Types (`types.ts`)
- **TokenData**: OAuth token structure
- **Channel**: External service channel representation
- **MessageData**: Message format for posting to external services
- **Provider Configuration Types**: Slack, Teams, and generic configurations
- **OAuth and State Management Types**: Callback parameters and state data

### Provider Interface (`provider.ts`)
- **IntegrationProvider**: Core interface all providers must implement
- **BaseIntegrationProvider**: Abstract base class with common functionality
- **ProviderRegistry**: Registry for managing integration providers

### Integration Service (`service.ts`)
- **IntegrationService**: Main service for managing integrations
- **MessageFormatter**: Interface for formatting messages for different providers
- **BaseMessageFormatter**: Base implementation with common formatting utilities

### Provider Implementations (`providers/`)
- **SlackProvider**: Slack integration implementation (stub)
- Future providers will be added here

### Setup (`setup.ts`)
- **initializeIntegrations()**: Register all available providers
- **getAvailableProviders()**: Get providers for UI display
- **getProvidersByType()**: Get categorized providers

## Usage Example

```typescript
import { 
  initializeIntegrations, 
  providerRegistry, 
  integrationService 
} from '~/utils/integrations'

// Initialize the system
initializeIntegrations()

// Get a provider
const slackProvider = providerRegistry.get('slack')

// Start OAuth flow
const authUrl = await integrationService.initiateOAuth(
  'org-123',
  'slack',
  'https://app.example.com/oauth/callback'
)
```

## Implementation Status

✅ **Completed in this task:**
- Core type definitions
- IntegrationProvider interface
- BaseIntegrationProvider abstract class
- ProviderRegistry for managing providers
- IntegrationService base structure
- MessageFormatter interfaces
- Slack provider stub implementation
- Setup and initialization utilities

🚧 **To be implemented in future tasks:**
- Database operations (token storage, connection management)
- Token encryption/decryption utilities
- OAuth flow implementation
- Slack API integration
- Message posting functionality
- Error handling and retry logic
- UI components for integration management

## Architecture Principles

1. **Extensibility**: New providers can be added by implementing the IntegrationProvider interface
2. **Type Safety**: Full TypeScript support with proper type definitions
3. **Separation of Concerns**: Clear separation between core interfaces, provider implementations, and service logic
4. **Security**: Token encryption and secure state management (to be implemented)
5. **Error Handling**: Comprehensive error handling and logging (to be implemented)

## Next Steps

The next tasks will implement:
1. Token encryption and security utilities
2. OAuth flow management system
3. Database schema and operations
4. Slack provider full implementation
5. UI components for integration management