/**
 * Core integration types and interfaces for third-party service integrations
 */

// Token data structure for OAuth and API key authentication
export interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scope?: string
  metadata?: Record<string, any>
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

export interface JiraConfig {
  instanceUrl: string
  cloudId: string
  scope: string
  user: {
    accountId: string
    displayName: string
    emailAddress?: string
  }
  // Bot user configuration
  useBotUser?: boolean
  botUser?: {
    accountId: string
    displayName: string
    emailAddress?: string
  }
}

export interface LinearConfig {
  userId: string
  userName: string
  userEmail: string
  scope: string
}

export interface GitLabConfig {
  instanceUrl: string
  scope: string
  user: {
    id: number
    username: string
    name: string
    email?: string
    avatarUrl?: string
  }
}

// Connection-specific configuration
export interface SlackConnectionConfig {
  channelName: string
  channelType: 'public' | 'private'
  postFormat: 'blocks' | 'text'
  includeContent: boolean
}

export interface JiraConnectionConfig {
  projectKey: string
  projectName: string
  defaultIssueType: string
  includeNoteContent: boolean
  // Bot user settings for this connection
  useBotUser?: boolean
  reporterAccountId?: string // Override the issue reporter
}

export interface LinearConnectionConfig {
  channelId: string
  channelName: string
  channelType: 'team' | 'project'
  includeNoteContent: boolean
  defaultIssueState?: string
  issuePriority?: string
}

export interface GitLabConnectionConfig {
  projectId: string
  projectName: string
  projectPath: string
  includeNoteContent: boolean
  defaultLabels?: string[]
  milestoneId?: number
  assigneeId?: number
}

// Generic provider configuration
export type ProviderConfig = SlackConfig | TeamsConfig | JiraConfig | LinearConfig | GitLabConfig | Record<string, any>

// Generic connection configuration
export type ConnectionConfig = SlackConnectionConfig | JiraConnectionConfig | LinearConnectionConfig | GitLabConnectionConfig | Record<string, any>

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
  nonce?: string
  [key: string]: any
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