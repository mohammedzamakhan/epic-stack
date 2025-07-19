/**
 * Core integration types and interfaces for third-party service integrations
 */

// Token data structure for OAuth and API key authentication
export interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
}

// Channel representation for messaging services
export interface Channel {
  id: string
  name: string
  type: 'public' | 'private' | 'dm'
  metadata?: Record<string, any>
}

// Message data structure for posting to external services
export interface MessageData {
  title: string
  content: string
  author: string
  noteUrl: string
  changeType: 'created' | 'updated' | 'deleted'
}

// Provider-specific configuration types
export interface SlackConfig {
  teamId: string
  teamName: string
  botUserId: string
  scope: string
}

export interface TeamsConfig {
  tenantId: string
  teamId?: string
  scope: string
}

// Connection-specific configuration
export interface SlackConnectionConfig {
  channelName: string
  channelType: 'public' | 'private'
  postFormat: 'blocks' | 'text'
  includeContent: boolean
}

// Generic provider configuration
export type ProviderConfig = SlackConfig | TeamsConfig | Record<string, any>

// Generic connection configuration
export type ConnectionConfig = SlackConnectionConfig | Record<string, any>

// OAuth callback parameters
export interface OAuthCallbackParams {
  organizationId: string
  code: string
  state: string
  error?: string
  errorDescription?: string
}

// OAuth state data
export interface OAuthState {
  organizationId: string
  providerName: string
  redirectUrl?: string
  timestamp: number
}

// Integration status types
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'expired'

// Integration provider types
export type ProviderType = 'productivity' | 'ticketing' | 'communication'

// Integration log entry
export interface IntegrationLogEntry {
  action: string
  status: 'success' | 'error' | 'pending'
  requestData?: Record<string, any>
  responseData?: Record<string, any>
  errorMessage?: string
  timestamp: Date
}

// Integration provider interface
export interface IntegrationProvider {
  name: string
  type: ProviderType
  
  // OAuth flow methods
  getAuthUrl(organizationId: string, redirectUri: string): Promise<string>
  handleCallback(code: string, state: string): Promise<TokenData>
  refreshToken?(refreshToken: string): Promise<TokenData>
  revokeToken?(accessToken: string): Promise<void>
  
  // Provider-specific operations
  getAvailableChannels(accessToken: string): Promise<Channel[]>
  postMessage(accessToken: string, channelId: string, message: MessageData): Promise<void>
  validateConnection(accessToken: string, channelId: string): Promise<boolean>
}