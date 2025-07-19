/**
 * Core integration service for managing third-party integrations
 */

import type { Integration, NoteIntegrationConnection, OrganizationNote } from '@prisma/client'
import type {
  TokenData,
  Channel,
  MessageData,
  OAuthCallbackParams,
  IntegrationStatus,
  ProviderType,
  IntegrationLogEntry,
} from './types'
import type { IntegrationProvider } from './provider'
import { providerRegistry } from './provider'

/**
 * Main service class for managing integrations
 */
export class IntegrationService {
  /**
   * Initiate OAuth flow for a provider
   * @param organizationId - Organization ID
   * @param providerName - Name of the provider to connect
   * @param redirectUri - OAuth callback URI
   * @param additionalParams - Provider-specific parameters
   * @returns Object containing authorization URL and state
   */
  async initiateOAuth(
    organizationId: string,
    providerName: string,
    redirectUri: string,
    additionalParams?: Record<string, any>
  ): Promise<{
    authUrl: string
    state: string
  }> {
    const { OAuthFlowManager } = await import('./oauth-manager')
    return OAuthFlowManager.startOAuthFlow(organizationId, providerName, redirectUri, additionalParams)
  }

  /**
   * Handle OAuth callback and create integration
   * @param providerName - Provider name
   * @param params - OAuth callback parameters
   * @returns Token data and state information
   */
  async handleOAuthCallback(
    providerName: string,
    params: OAuthCallbackParams
  ): Promise<{
    tokenData: TokenData
    stateData: import('./types').OAuthState
  }> {
    const { OAuthFlowManager } = await import('./oauth-manager')
    return OAuthFlowManager.completeOAuthFlow(providerName, params)
  }

  /**
   * Get available channels for an integration
   * @param integrationId - Integration ID
   * @returns Available channels
   */
  async getAvailableChannels(integrationId: string): Promise<Channel[]> {
    // This will be implemented with database operations in a later task
    throw new Error('getAvailableChannels not yet implemented - requires database operations')
  }

  /**
   * Connect a note to a channel
   * @param noteId - Note ID
   * @param integrationId - Integration ID
   * @param channelId - Channel ID
   * @param config - Connection-specific configuration
   * @returns Created connection
   */
  async connectNoteToChannel(
    noteId: string,
    integrationId: string,
    channelId: string,
    config?: Record<string, any>
  ): Promise<NoteIntegrationConnection> {
    // This will be implemented with database operations in a later task
    throw new Error('connectNoteToChannel not yet implemented - requires database operations')
  }

  /**
   * Disconnect a note from a channel
   * @param connectionId - Connection ID to remove
   */
  async disconnectNoteFromChannel(connectionId: string): Promise<void> {
    // This will be implemented with database operations in a later task
    throw new Error('disconnectNoteFromChannel not yet implemented - requires database operations')
  }

  /**
   * Handle note updates and post to connected channels
   * @param noteId - Note ID that was updated
   * @param changeType - Type of change
   * @param userId - User who made the change
   */
  async handleNoteUpdate(
    noteId: string,
    changeType: 'created' | 'updated' | 'deleted',
    userId: string
  ): Promise<void> {
    // This will be implemented with database operations and message posting in later tasks
    throw new Error('handleNoteUpdate not yet implemented - requires database operations and message posting')
  }

  /**
   * Refresh expired tokens for an integration
   * @param providerName - Provider name
   * @param currentTokenData - Current token data
   * @returns Refreshed token data
   */
  async refreshTokens(
    providerName: string,
    currentTokenData: TokenData
  ): Promise<TokenData> {
    const { OAuthFlowManager } = await import('./oauth-manager')
    return OAuthFlowManager.ensureValidToken(providerName, currentTokenData)
  }

  /**
   * Check if token needs refresh
   * @param tokenData - Token data to check
   * @returns True if token should be refreshed
   */
  shouldRefreshToken(tokenData: TokenData): boolean {
    const { TokenRefreshManager } = require('./oauth-manager')
    return TokenRefreshManager.shouldRefreshToken(tokenData)
  }

  /**
   * Check if token is expired
   * @param tokenData - Token data to check
   * @returns True if token is expired
   */
  isTokenExpired(tokenData: TokenData): boolean {
    const { TokenRefreshManager } = require('./oauth-manager')
    return TokenRefreshManager.isTokenExpired(tokenData)
  }

  /**
   * Validate all connections for an integration
   * @param integrationId - Integration ID
   * @returns Validation results
   */
  async validateIntegrationConnections(integrationId: string): Promise<{
    valid: number
    invalid: number
    errors: string[]
  }> {
    // This will be implemented with database operations and connection validation in later tasks
    throw new Error('validateIntegrationConnections not yet implemented - requires database operations')
  }

  /**
   * Get integration status and health
   * @param integrationId - Integration ID
   * @returns Integration status information
   */
  async getIntegrationStatus(integrationId: string): Promise<{
    status: IntegrationStatus
    lastSync?: Date
    connectionCount: number
    recentErrors: IntegrationLogEntry[]
  }> {
    // This will be implemented with database operations in a later task
    throw new Error('getIntegrationStatus not yet implemented - requires database operations')
  }

  /**
   * Disconnect an integration and all its connections
   * @param integrationId - Integration ID to disconnect
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    // This will be implemented with database operations in a later task
    throw new Error('disconnectIntegration not yet implemented - requires database operations')
  }

  /**
   * Get all integrations for an organization
   * @param organizationId - Organization ID
   * @param type - Optional provider type filter
   * @returns List of integrations
   */
  async getOrganizationIntegrations(
    organizationId: string,
    type?: ProviderType
  ): Promise<Integration[]> {
    // This will be implemented with database operations in a later task
    throw new Error('getOrganizationIntegrations not yet implemented - requires database operations')
  }

  /**
   * Get all connections for a note
   * @param noteId - Note ID
   * @returns List of connections
   */
  async getNoteConnections(noteId: string): Promise<NoteIntegrationConnection[]> {
    // This will be implemented with database operations in a later task
    throw new Error('getNoteConnections not yet implemented - requires database operations')
  }

  /**
   * Log integration activity
   * @param integrationId - Integration ID
   * @param action - Action performed
   * @param status - Action status
   * @param data - Additional data
   * @param error - Error message if applicable
   */
  async logIntegrationActivity(
    integrationId: string,
    action: string,
    status: 'success' | 'error' | 'pending',
    data?: Record<string, any>,
    error?: string
  ): Promise<void> {
    // This will be implemented with database operations in a later task
    throw new Error('logIntegrationActivity not yet implemented - requires database operations')
  }

  /**
   * Format note data into message format
   * @param note - Note data
   * @param changeType - Type of change
   * @param author - Author information
   * @returns Formatted message data
   */
  formatNoteMessage(
    note: OrganizationNote,
    changeType: 'created' | 'updated' | 'deleted',
    author: { name: string }
  ): MessageData {
    return {
      title: note.title,
      content: this.truncateContent(note.content || ''),
      author: author.name,
      noteUrl: this.generateNoteUrl(note),
      changeType,
    }
  }

  /**
   * Truncate content to a reasonable length for external posting
   * @param content - Original content
   * @param maxLength - Maximum length (default 500)
   * @returns Truncated content
   */
  private truncateContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content
    }
    
    return content.substring(0, maxLength - 3) + '...'
  }

  /**
   * Generate URL for a note
   * @param note - Note data
   * @returns Note URL
   */
  private generateNoteUrl(note: OrganizationNote): string {
    // This will need to be implemented based on the app's routing structure
    return `/notes/${note.id}`
  }
}

/**
 * Message formatter interface for different providers
 */
export interface MessageFormatter {
  formatNoteCreated(note: OrganizationNote, author: { name: string }): MessageData
  formatNoteUpdated(note: OrganizationNote, author: { name: string }, changes?: string[]): MessageData
  formatNoteDeleted(noteTitle: string, author: { name: string }): MessageData
}

/**
 * Base message formatter with common functionality
 */
export abstract class BaseMessageFormatter implements MessageFormatter {
  abstract formatNoteCreated(note: OrganizationNote, author: { name: string }): MessageData
  abstract formatNoteUpdated(note: OrganizationNote, author: { name: string }, changes?: string[]): MessageData
  abstract formatNoteDeleted(noteTitle: string, author: { name: string }): MessageData

  /**
   * Truncate content for external posting
   * @param content - Original content
   * @param maxLength - Maximum length
   * @returns Truncated content
   */
  protected truncateContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content
    }
    
    return content.substring(0, maxLength - 3) + '...'
  }

  /**
   * Generate note URL
   * @param note - Note data
   * @returns Note URL
   */
  protected generateNoteUrl(note: OrganizationNote): string {
    return `/notes/${note.id}`
  }
}

// Global integration service instance
export const integrationService = new IntegrationService()