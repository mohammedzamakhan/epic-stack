/**
 * Integration Manager - Core service for managing third-party integrations
 * 
 * This service provides comprehensive integration management including:
 * - Provider registry management
 * - Integration CRUD operations
 * - Note-to-channel connection management
 * - OAuth flow coordination
 * - Token management and refresh
 * - Message posting and notification handling
 */

import type { 
  Integration, 
  NoteIntegrationConnection, 
  OrganizationNote,
  User,
  Organization 
} from '@prisma/client'
import type {
  TokenData,
  Channel,
  MessageData,
  OAuthCallbackParams,
  IntegrationStatus,
  ProviderType,
  IntegrationLogEntry,
  OAuthState,
} from './types'
import type { IntegrationProvider } from './provider'
import { providerRegistry } from './provider'
import { prisma } from '../db.server'

/**
 * Extended Integration type with relations
 */
export type IntegrationWithRelations = Integration & {
  organization?: Organization
  connections?: (NoteIntegrationConnection & {
    note?: OrganizationNote
  })[]
}

/**
 * Extended Connection type with relations
 */
export type ConnectionWithRelations = NoteIntegrationConnection & {
  integration: Integration
  note?: OrganizationNote
}

/**
 * Integration creation parameters
 */
export interface CreateIntegrationParams {
  organizationId: string
  providerName: string
  tokenData: TokenData
  config?: Record<string, any>
}

/**
 * Connection creation parameters
 */
export interface CreateConnectionParams {
  noteId: string
  integrationId: string
  externalId: string
  config?: Record<string, any>
}

/**
 * Integration statistics
 */
export interface IntegrationStats {
  totalConnections: number
  activeConnections: number
  recentActivity: number
  lastActivity?: Date
  errorCount: number
}

/**
 * Main Integration Manager class
 * 
 * Provides centralized management of all integration operations including
 * provider registry, OAuth flows, CRUD operations, and message handling.
 */
export class IntegrationManager {
  private static instance: IntegrationManager
  
  /**
   * Get singleton instance of IntegrationManager
   */
  static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager()
    }
    return IntegrationManager.instance
  }

  // Provider Registry Management

  /**
   * Register a new integration provider
   * @param provider - Provider instance to register
   */
  registerProvider(provider: IntegrationProvider): void {
    providerRegistry.register(provider)
  }

  /**
   * Get a provider by name
   * @param name - Provider name
   * @returns Provider instance
   * @throws Error if provider not found
   */
  getProvider(name: string): IntegrationProvider {
    return providerRegistry.get(name)
  }

  /**
   * Get all registered providers
   * @returns Array of all providers
   */
  getAllProviders(): IntegrationProvider[] {
    return providerRegistry.getAll()
  }

  /**
   * Get providers by type
   * @param type - Provider type to filter by
   * @returns Array of providers matching the type
   */
  getProvidersByType(type: ProviderType): IntegrationProvider[] {
    return providerRegistry.getByType(type)
  }

  // OAuth Flow Management

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
    const provider = this.getProvider(providerName)
    
    // Get authorization URL from provider (provider will generate its own state)
    const authUrl = await provider.getAuthUrl(organizationId, redirectUri, additionalParams)
    
    // Extract state from the URL for consistency
    const url = new URL(authUrl)
    const state = url.searchParams.get('state') || ''
    
    return { authUrl, state }
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
    const provider = this.getProvider(providerName)
    
    // Parse simplified state
    let stateData
    try {
      stateData = JSON.parse(Buffer.from(params.state, 'base64').toString())
    } catch (error) {
      throw new Error('Invalid OAuth state')
    }
    
    if (stateData.providerName !== providerName) {
      throw new Error('Provider name mismatch in OAuth state')
    }
    
    // Handle OAuth callback with provider
    const tokenData = await provider.handleCallback(params)
    
    // Create integration in database
    const integration = await this.createIntegration({
      organizationId: stateData.organizationId,
      providerName,
      tokenData,
      config: {}
    })
    
    // Log successful OAuth completion
    await this.logIntegrationActivity(
      integration.id,
      'oauth_complete',
      'success',
      { provider: providerName }
    )
    
    return integration
  }

  // Integration CRUD Operations

  /**
   * Create a new integration
   * @param params - Integration creation parameters
   * @returns Created integration
   */
  async createIntegration(params: CreateIntegrationParams): Promise<Integration> {
    const { organizationId, providerName, tokenData, config = {} } = params
    
    const provider = this.getProvider(providerName)
    
    // For demo purposes, store tokens without encryption
    // In production, you would encrypt these tokens
    const accessToken = tokenData.accessToken
    const refreshToken = tokenData.refreshToken || null
    
    // Create integration record
    const integration = await prisma.integration.create({
      data: {
        organizationId,
        providerName,
        providerType: provider.type,
        accessToken,
        refreshToken,
        tokenExpiresAt: tokenData.expiresAt,
        config: JSON.stringify({
          ...config,
          scope: tokenData.scope,
          metadata: tokenData.metadata || {}
        }),
        isActive: true,
        lastSyncAt: new Date(),
      },
    })
    
    return integration
  }

  /**
   * Get integration by ID
   * @param integrationId - Integration ID
   * @returns Integration with relations
   */
  async getIntegration(integrationId: string): Promise<IntegrationWithRelations | null> {
    return prisma.integration.findUnique({
      where: { id: integrationId },
      include: {
        organization: true,
        connections: {
          include: {
            note: true
          }
        }
      }
    })
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
  ): Promise<IntegrationWithRelations[]> {
    return prisma.integration.findMany({
      where: {
        organizationId,
        ...(type && { providerType: type }),
        isActive: true
      },
      include: {
        organization: true,
        connections: {
          include: {
            note: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  /**
   * Update integration configuration
   * @param integrationId - Integration ID
   * @param config - New configuration
   * @returns Updated integration
   */
  async updateIntegrationConfig(
    integrationId: string,
    config: Record<string, any>
  ): Promise<Integration> {
    const integration = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        config: JSON.stringify(config),
        updatedAt: new Date()
      }
    })
    
    await this.logIntegrationActivity(
      integrationId,
      'config_update',
      'success',
      { config }
    )
    
    return integration
  }

  /**
   * Disconnect an integration and all its connections
   * @param integrationId - Integration ID to disconnect
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    // Get integration details for logging
    const integration = await this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }
    
    // Delete all connections first
    await prisma.noteIntegrationConnection.deleteMany({
      where: { integrationId }
    })
    
    // Delete integration logs
    await prisma.integrationLog.deleteMany({
      where: { integrationId }
    })
    
    // Delete the integration
    await prisma.integration.delete({
      where: { id: integrationId }
    })
    
    // Log disconnection
    await this.logIntegrationActivity(
      integrationId,
      'disconnect',
      'success',
      { 
        provider: integration.providerName,
        connectionCount: integration.connections?.length || 0
      }
    )
  }

  // Note-to-Channel Connection Management

  /**
   * Connect a note to a channel
   * @param params - Connection creation parameters
   * @returns Created connection
   */
  async connectNoteToChannel(params: CreateConnectionParams): Promise<NoteIntegrationConnection> {
    const { noteId, integrationId, externalId, config = {} } = params
    
    // Validate integration exists and is active
    const integration = await this.getIntegration(integrationId)
    if (!integration || !integration.isActive) {
      throw new Error('Integration not found or inactive')
    }
    
    // Validate note exists and belongs to same organization
    const note = await prisma.organizationNote.findUnique({
      where: { id: noteId },
      include: { organization: true }
    })
    
    if (!note) {
      throw new Error('Note not found')
    }
    
    if (note.organizationId !== integration.organizationId) {
      throw new Error('Note and integration must belong to the same organization')
    }
    
    // Validate channel exists and is accessible
    const provider = this.getProvider(integration.providerName)
    const channels = await provider.getAvailableChannels(integration)
    const channel = channels.find(c => c.id === externalId)
    
    if (!channel) {
      throw new Error('Channel not found or not accessible')
    }
    
    // Create connection
    const connection = await prisma.noteIntegrationConnection.create({
      data: {
        noteId,
        integrationId,
        externalId,
        config: JSON.stringify({
          ...config,
          channelName: channel.name,
          channelType: channel.type,
          channelMetadata: channel.metadata || {}
        }),
        isActive: true
      }
    })
    
    // Log connection creation
    await this.logIntegrationActivity(
      integrationId,
      'connection_create',
      'success',
      { 
        noteId,
        channelId: externalId,
        channelName: channel.name
      }
    )
    
    return connection
  }

  /**
   * Disconnect a note from a channel
   * @param connectionId - Connection ID to remove
   */
  async disconnectNoteFromChannel(connectionId: string): Promise<void> {
    const connection = await prisma.noteIntegrationConnection.findUnique({
      where: { id: connectionId },
      include: { integration: true, note: true }
    })
    
    if (!connection) {
      throw new Error('Connection not found')
    }
    
    // Delete the connection
    await prisma.noteIntegrationConnection.delete({
      where: { id: connectionId }
    })
    
    // Log disconnection
    await this.logIntegrationActivity(
      connection.integrationId,
      'connection_delete',
      'success',
      { 
        noteId: connection.noteId,
        channelId: connection.externalId
      }
    )
  }

  /**
   * Get all connections for a note
   * @param noteId - Note ID
   * @returns List of connections with integration details
   */
  async getNoteConnections(noteId: string): Promise<ConnectionWithRelations[]> {
    return prisma.noteIntegrationConnection.findMany({
      where: { 
        noteId,
        isActive: true
      },
      include: {
        integration: true,
        note: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  /**
   * Get all connections for an integration
   * @param integrationId - Integration ID
   * @returns List of connections
   */
  async getIntegrationConnections(integrationId: string): Promise<ConnectionWithRelations[]> {
    return prisma.noteIntegrationConnection.findMany({
      where: { 
        integrationId,
        isActive: true
      },
      include: {
        integration: true,
        note: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  // Channel and Provider Operations

  /**
   * Get available channels for an integration
   * @param integrationId - Integration ID
   * @returns Available channels
   */
  async getAvailableChannels(integrationId: string): Promise<Channel[]> {
    const integration = await this.getIntegration(integrationId)
    if (!integration || !integration.isActive) {
      throw new Error('Integration not found or inactive')
    }
    
    const provider = this.getProvider(integration.providerName)
    
    try {
      const channels = await provider.getAvailableChannels(integration)
      
      // Log successful channel fetch
      await this.logIntegrationActivity(
        integrationId,
        'fetch_channels',
        'success',
        { channelCount: channels.length }
      )
      
      return channels
    } catch (error) {
      // Log error
      await this.logIntegrationActivity(
        integrationId,
        'fetch_channels',
        'error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  }

  // Message Posting and Notifications

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
    // Get note connections
    const connections = await this.getNoteConnections(noteId)
    
    if (connections.length === 0) {
      return // No connections to notify
    }
    
    // Get note and user details
    const note = await prisma.organizationNote.findUnique({
      where: { id: noteId }
    })
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!note || !user) {
      throw new Error('Note or user not found')
    }
    
    // Format message
    const message: MessageData = {
      title: note.title,
      content: this.truncateContent(note.content || ''),
      author: user.name || user.username,
      noteUrl: this.generateNoteUrl(note),
      changeType
    }
    
    // Post to all connected channels
    const results = await Promise.allSettled(
      connections.map(connection => this.postMessageToConnection(connection, message))
    )
    
    // Log overall results
    const successCount = results.filter(r => r.status === 'fulfilled').length
    const errorCount = results.filter(r => r.status === 'rejected').length
    
    if (errorCount > 0) {
      console.warn(`Note update notification: ${successCount} succeeded, ${errorCount} failed`)
    }
  }

  /**
   * Post a message to a specific connection
   * @param connection - Connection to post to
   * @param message - Message to post
   */
  private async postMessageToConnection(
    connection: ConnectionWithRelations,
    message: MessageData
  ): Promise<void> {
    try {
      const provider = this.getProvider(connection.integration.providerName)
      await provider.postMessage(connection, message)
      
      // Update last posted timestamp
      await prisma.noteIntegrationConnection.update({
        where: { id: connection.id },
        data: { lastPostedAt: new Date() }
      })
      
      // Log successful post
      await this.logIntegrationActivity(
        connection.integrationId,
        'post_message',
        'success',
        {
          noteId: connection.noteId,
          channelId: connection.externalId,
          changeType: message.changeType
        }
      )
    } catch (error) {
      // Log error but don't throw to allow other connections to succeed
      await this.logIntegrationActivity(
        connection.integrationId,
        'post_message',
        'error',
        {
          noteId: connection.noteId,
          channelId: connection.externalId,
          changeType: message.changeType
        },
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      throw error // Re-throw for Promise.allSettled handling
    }
  }

  // Token Management

  /**
   * Refresh expired tokens for an integration
   * @param integrationId - Integration ID
   * @returns Updated integration with new tokens
   */
  async refreshIntegrationTokens(integrationId: string): Promise<Integration> {
    const integration = await this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }
    
    if (!integration.refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const provider = this.getProvider(integration.providerName)
    
    // Decrypt current refresh token
    const { decryptToken } = await import('./encryption')
    const refreshToken = await decryptToken(integration.refreshToken)
    
    try {
      // Get new tokens from provider
      const tokenData = await provider.refreshToken(refreshToken)
      
      // Encrypt new tokens
      const { encryptToken } = await import('./encryption')
      const encryptedAccessToken = await encryptToken(tokenData.accessToken)
      const encryptedRefreshToken = tokenData.refreshToken 
        ? await encryptToken(tokenData.refreshToken) 
        : integration.refreshToken // Keep existing if not provided
      
      // Update integration
      const updatedIntegration = await prisma.integration.update({
        where: { id: integrationId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          lastSyncAt: new Date()
        }
      })
      
      // Log successful refresh
      await this.logIntegrationActivity(
        integrationId,
        'token_refresh',
        'success'
      )
      
      return updatedIntegration
    } catch (error) {
      // Log error
      await this.logIntegrationActivity(
        integrationId,
        'token_refresh',
        'error',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      throw error
    }
  }

  // Validation and Health Checks

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
    const connections = await this.getIntegrationConnections(integrationId)
    const errors: string[] = []
    let valid = 0
    let invalid = 0
    
    if (connections.length === 0) {
      return { valid: 0, invalid: 0, errors: ['No connections found'] }
    }
    
    const provider = this.getProvider(connections[0].integration.providerName)
    if (!provider) {
      return { valid: 0, invalid: connections.length, errors: ['Provider not found'] }
    }
    
    // Validate each connection
    for (const connection of connections) {
      try {
        const isValid = await provider.validateConnection(connection)
        if (isValid) {
          valid++
        } else {
          invalid++
          errors.push(`Connection ${connection.id} is invalid`)
        }
      } catch (error) {
        invalid++
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Connection ${connection.id}: ${errorMsg}`)
      }
    }
    
    // Log validation results
    await this.logIntegrationActivity(
      integrationId,
      'validate_connections',
      errors.length > 0 ? 'error' : 'success',
      { valid, invalid, totalConnections: connections.length }
    )
    
    return { valid, invalid, errors }
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
    const integration = await this.getIntegration(integrationId)
    if (!integration) {
      throw new Error('Integration not found')
    }
    
    // Get recent error logs
    const recentErrors = await prisma.integrationLog.findMany({
      where: {
        integrationId,
        status: 'error',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    
    // Determine status
    let status: IntegrationStatus = 'active'
    
    if (!integration.isActive) {
      status = 'inactive'
    } else if (recentErrors.length > 5) {
      status = 'error'
    } else if (integration.tokenExpiresAt && integration.tokenExpiresAt < new Date()) {
      status = 'expired'
    }
    
    return {
      status,
      lastSync: integration.lastSyncAt || undefined,
      connectionCount: integration.connections?.length || 0,
      recentErrors: recentErrors.map(log => ({
        action: log.action,
        status: log.status as 'success' | 'error' | 'pending',
        requestData: log.requestData ? this.safeJsonParse(log.requestData) : undefined,
        responseData: log.responseData ? this.safeJsonParse(log.responseData) : undefined,
        errorMessage: log.errorMessage || undefined,
        timestamp: log.createdAt
      }))
    }
  }

  /**
   * Get integration statistics
   * @param integrationId - Integration ID
   * @returns Integration statistics
   */
  async getIntegrationStats(integrationId: string): Promise<IntegrationStats> {
    const connections = await this.getIntegrationConnections(integrationId)
    const activeConnections = connections.filter(c => c.isActive).length
    
    // Get recent activity (last 7 days)
    const recentActivity = await prisma.integrationLog.count({
      where: {
        integrationId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    })
    
    // Get error count (last 24 hours)
    const errorCount = await prisma.integrationLog.count({
      where: {
        integrationId,
        status: 'error',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })
    
    // Get last activity
    const lastActivity = await prisma.integrationLog.findFirst({
      where: { integrationId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })
    
    return {
      totalConnections: connections.length,
      activeConnections,
      recentActivity,
      lastActivity: lastActivity?.createdAt,
      errorCount
    }
  }

  // Logging and Monitoring

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
    try {
      await prisma.integrationLog.create({
        data: {
          integrationId,
          action,
          status,
          requestData: data ? JSON.stringify(data) : null,
          errorMessage: error,
          createdAt: new Date()
        }
      })
    } catch (logError) {
      // Don't throw on logging errors to avoid breaking main functionality
      console.error('Failed to log integration activity:', logError)
    }
  }

  // Utility Methods

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
    // Get the base URL from environment or use localhost for development
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3001'
    return `${baseUrl}/app/notes/${note.id}`
  }

  /**
   * Safely parse JSON string, returning undefined if parsing fails
   * @param jsonString - JSON string to parse
   * @returns Parsed object or undefined
   */
  private safeJsonParse(jsonString: string): Record<string, any> | undefined {
    try {
      return JSON.parse(jsonString)
    } catch {
      return undefined
    }
  }
}

// Export singleton instance
export const integrationManager = IntegrationManager.getInstance()