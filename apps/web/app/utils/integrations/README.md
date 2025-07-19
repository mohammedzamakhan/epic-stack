# Integration System

This directory contains the core integration system for connecting with third-party services like Slack, Microsoft Teams, and other productivity tools.

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

### OAuth Flow Management (`oauth-manager.ts`)
- **OAuthStateManager**: Secure OAuth state generation and validation
- **OAuthCallbackHandler**: Generic OAuth callback processing
- **TokenRefreshManager**: Token refresh with retry logic
- **OAuthFlowManager**: Complete OAuth flow orchestration

### Security & Encryption (`encryption.ts`, `token-manager.ts`, `security.ts`)
- **IntegrationEncryptionService**: AES-256-GCM encryption for OAuth tokens
- **TokenManager**: Secure token storage, retrieval, and refresh management
- **IntegrationSecurityUtils**: Rate limiting, validation, and security utilities

### Provider Implementations (`providers/`)
- **SlackProvider**: Slack integration implementation
- Future providers will be added here

### Setup (`setup.ts`)
- **initializeIntegrations()**: Register all available providers
- **getAvailableProviders()**: Get providers for UI display
- **getProvidersByType()**: Get categorized providers

## OAuth Flow Management

The OAuth flow management system provides secure, robust handling of OAuth 2.0 flows:

### Key Features

- **Secure State Management**: Cryptographically signed OAuth states with expiration
- **Token Refresh**: Automatic token refresh with exponential backoff retry logic
- **Error Handling**: Comprehensive error handling and validation
- **Security**: CSRF protection, signature verification, and tamper detection

### Usage

```typescript
import { OAuthFlowManager } from '#app/utils/integrations'

// Start OAuth flow
const { authUrl, state } = await OAuthFlowManager.startOAuthFlow(
  'org-123',
  'slack',
  'https://yourapp.com/callback'
)

// Handle OAuth callback
const { tokenData, stateData } = await OAuthFlowManager.completeOAuthFlow('slack', {
  code: 'auth-code',
  state: 'oauth-state',
  organizationId: 'org-123'
})

// Ensure token is valid (refresh if needed)
const validToken = await OAuthFlowManager.ensureValidToken('slack', currentToken)
```

### Components

#### OAuthStateManager
- Generates cryptographically secure OAuth states
- Validates states with signature verification
- Includes expiration and tamper detection

#### OAuthCallbackHandler
- Handles OAuth callbacks from providers
- Validates state and exchanges codes for tokens
- Provides error handling for OAuth errors

#### TokenRefreshManager
- Detects when tokens need refresh
- Implements retry logic with exponential backoff
- Handles refresh token expiration

#### OAuthFlowManager
- Orchestrates complete OAuth flows
- Combines all utilities for easy usage
- Provides high-level API for OAuth operations

## Security Features

### Token Encryption

All OAuth tokens are encrypted using AES-256-GCM encryption before storage:

```typescript
import { integrationEncryption } from '#app/utils/integrations'

// Encrypt token data
const encryptedData = await integrationEncryption.encryptTokenData(tokenData)

// Decrypt token data
const decryptedData = await integrationEncryption.decryptTokenData(encryptedData)
```

### Token Management

The token manager handles secure storage, retrieval, and refresh:

```typescript
import { tokenManager } from '#app/utils/integrations'

// Store encrypted tokens
await tokenManager.storeTokenData(integrationId, tokenData)

// Get valid access token (with automatic refresh)
const accessToken = await tokenManager.getValidAccessToken(integration, provider)
```

### Security Utilities

Additional security features include rate limiting and validation:

```typescript
import { integrationSecurity, RATE_LIMITS } from '#app/utils/integrations'

// Check rate limits
const rateLimit = integrationSecurity.checkRateLimit(key, RATE_LIMITS.API_CALLS)

// Validate webhook signatures
const isValid = await integrationSecurity.validateWebhookSignature(payload, signature, secret)
```

## Environment Setup

Required environment variables:

```bash
# 64-character hex string (32 bytes) for AES-256 encryption
INTEGRATION_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# OAuth state signing secret
OAUTH_STATE_SECRET=your-oauth-state-secret-key

# Provider-specific credentials
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
```

Generate a new encryption key:

```typescript
import { generateNewEncryptionKey } from '#app/utils/integrations'

const key = generateNewEncryptionKey()
console.log('INTEGRATION_ENCRYPTION_KEY=' + key)
```

## Usage Example

```typescript
import { 
  initializeIntegrations, 
  providerRegistry, 
  integrationService,
  tokenManager
} from '#app/utils/integrations'

// Initialize the system
initializeIntegrations()

// Get a provider
const slackProvider = providerRegistry.get('slack')

// Start OAuth flow (now returns auth URL and state)
const { authUrl, state } = await integrationService.initiateOAuth(
  'org-123',
  'slack',
  'https://app.example.com/oauth/callback'
)

// Handle OAuth callback
const { tokenData, stateData } = await integrationService.handleOAuthCallback('slack', {
  code: 'auth-code',
  state: state,
  organizationId: 'org-123'
})

// Store tokens securely
await tokenManager.storeTokenData(integrationId, tokenData)
```

## Testing

Verify encryption functionality:

```bash
npx tsx apps/web/app/utils/integrations/verify-encryption.ts
```

Verify OAuth flow management:

```bash
npx tsx apps/web/app/utils/integrations/verify-oauth-manager.ts
```

## Implementation Status

✅ **Completed:**
- Core type definitions and interfaces
- IntegrationProvider interface and base classes
- ProviderRegistry for managing providers
- IntegrationService base structure
- **Token encryption and security utilities (AES-256-GCM)**
- **Secure token storage and management**
- **Rate limiting and security validation**
- **OAuth flow management system**
  - **OAuth state generation and validation with cryptographic signing**
  - **Generic OAuth callback handler**
  - **Token refresh mechanism with retry logic**
  - **Complete OAuth flow orchestration**
- MessageFormatter interfaces
- Setup and initialization utilities

🚧 **To be implemented in future tasks:**
- Slack API integration
- Message posting functionality
- Database operations integration
- UI components for integration management

## Architecture Principles

1. **Security First**: All tokens encrypted at rest, secure state management, rate limiting
2. **Extensibility**: New providers can be added by implementing the IntegrationProvider interface
3. **Type Safety**: Full TypeScript support with proper type definitions
4. **Separation of Concerns**: Clear separation between core interfaces, provider implementations, and service logic
5. **Error Handling**: Comprehensive error handling and logging