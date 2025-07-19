/**
 * Core integration service for managing third-party integrations
 * 
 * This service acts as a facade over the IntegrationManager, providing
 * a simplified interface for common integration operations.
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
import { integrationManager } from './integration-manager'

/**
 * Main service class for managing integrations
 * 
 * This class provides a simplified interface over the IntegrationManager
 * for common integration operations.
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
    return integrationManager.initiateOAuth(organizationId, providerName, redirectUri, additionalParams)
  }

  /**
   * Handle OAuth callback and create integration
   * @param providerName - Provider name
   * @param params - OAuth callback parameters
   * @returns Created integration
   */
  async handleOAuthCallback(
    providerName: string,
    params: OAuthCallbackParams
  ): Promise<Integration> {
    return integrationManager.handleOAuthCallback(providerName, params)
  }

  /**
   * Get available channels for an integration
   * @param integrationId - Integration ID
   * @returns Available channels
   */
  async getAvailableChannels(integrationId: string): Promise<Channel[]> {
    return integrationManager.getAvailableChannels(integrationId)
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
    return integrationManager.connectNoteToChannel({
      noteId,
      integrationId,
      externalId: channelId,
      config
    })
  }

  /**
   * Disconnect a note from a channel
   * @param connectionId - Connection ID to remove
   */
  async disconnectNoteFromChannel(connectionId: string): Promise<void> {
    return integrationManager.disconnectNoteFromChannel(connectionId)
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
    return integrationManager.handleNoteUpdate(noteId, changeType, userId)
  }

  /**
   * Refresh expired tokens for an integration
   * @param integrationId - Integration ID
   * @returns Updated integration with refreshed tokens
   */
  async refreshTokens(integrationId: string): Promise<Integration> {
    return integrationManager.refreshIntegrationTokens(integrationId)
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
    return integrationManager.validateIntegrationConnections(integrationId)
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
    return integrationManager.getIntegrationStatus(integrationId)
  }

  /**
   * Disconnect an integration and all its connections
   * @param integrationId - Integration ID to disconnect
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    return integrationManager.disconnectIntegration(integrationId)
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
    return integrationManager.getOrganizationIntegrations(organizationId, type)
  }

  /**
   * Get all connections for a note
   * @param noteId - Note ID
   * @returns List of connections
   */
  async getNoteConnections(noteId: string): Promise<NoteIntegrationConnection[]> {
    return integrationManager.getNoteConnections(noteId)
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
    return integrationManager.logIntegrationActivity(integrationId, action, status, data, error)
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

  // Provider Management Methods

  /**
   * Register a new integration provider
   * @param provider - Provider instance to register
   */
  registerProvider(provider: IntegrationProvider): void {
    return integrationManager.registerProvider(provider)
  }

  /**
   * Get a provider by name
   * @param name - Provider name
   * @returns Provider instance
   */
  getProvider(name: string): IntegrationProvider {
    return integrationManager.getProvider(name)
  }

  /**
   * Get all registered providers
   * @returns Array of all providers
   */
  getAllProviders(): IntegrationProvider[] {
    return integrationManager.getAllProviders()
  }

  /**
   * Get providers by type
   * @param type - Provider type to filter by
   * @returns Array of providers matching the type
   */
  getProvidersByType(type: ProviderType): IntegrationProvider[] {
    return integrationManager.getProvidersByType(type)
  }

  // Additional Integration Management Methods

  /**
   * Get integration by ID
   * @param integrationId - Integration ID
   * @returns Integration with relations
   */
  async getIntegration(integrationId: string) {
    return integrationManager.getIntegration(integrationId)
  }

  /**
   * Get all connections for an integration
   * @param integrationId - Integration ID
   * @returns List of connections
   */
  async getIntegrationConnections(integrationId: string) {
    return integrationManager.getIntegrationConnections(integrationId)
  }

  /**
   * Get integration statistics
   * @param integrationId - Integration ID
   * @returns Integration statistics
   */
  async getIntegrationStats(integrationId: string) {
    return integrationManager.getIntegrationStats(integrationId)
  }

  /**
   * Update integration configuration
   * @param integrationId - Integration ID
   * @param config - New configuration
   * @returns Updated integration
   */
  async updateIntegrationConfig(integrationId: string, config: Record<string, any>) {
    return integrationManager.updateIntegrationConfig(integrationId, config)
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