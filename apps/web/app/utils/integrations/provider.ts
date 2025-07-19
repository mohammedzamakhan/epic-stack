/**
 * Core integration provider interface and base implementation
 */

import type { Integration, NoteIntegrationConnection } from '@prisma/client'
import type {
  TokenData,
  Channel,
  MessageData,
  OAuthCallbackParams,
  ProviderConfig,
  ProviderType,
  IntegrationStatus,
} from './types'

/**
 * Core interface that all integration providers must implement
 */
export interface IntegrationProvider {
  /** Provider name (e.g., 'slack', 'teams', 'jira') */
  readonly name: string
  
  /** Provider type category */
  readonly type: ProviderType
  
  /** Provider display name for UI */
  readonly displayName: string
  
  /** Provider description */
  readonly description: string
  
  /** Provider logo URL or path */
  readonly logoPath: string

  // OAuth flow methods
  
  /**
   * Generate OAuth authorization URL
   * @param organizationId - Organization ID requesting authorization
   * @param redirectUri - OAuth callback URI
   * @param additionalParams - Provider-specific parameters
   * @returns Promise resolving to authorization URL
   */
  getAuthUrl(
    organizationId: string, 
    redirectUri: string,
    additionalParams?: Record<string, any>
  ): Promise<string>
  
  /**
   * Handle OAuth callback and exchange code for tokens
   * @param params - OAuth callback parameters
   * @returns Promise resolving to token data
   */
  handleCallback(params: OAuthCallbackParams): Promise<TokenData>
  
  /**
   * Refresh expired access token
   * @param refreshToken - Refresh token
   * @returns Promise resolving to new token data
   */
  refreshToken(refreshToken: string): Promise<TokenData>

  // Provider-specific operations
  
  /**
   * Get available channels/destinations for the integration
   * @param integration - Integration instance with credentials
   * @returns Promise resolving to available channels
   */
  getAvailableChannels(integration: Integration): Promise<Channel[]>
  
  /**
   * Post a message to a connected channel
   * @param connection - Note-to-channel connection
   * @param message - Message data to post
   * @returns Promise that resolves when message is posted
   */
  postMessage(
    connection: NoteIntegrationConnection & { integration: Integration }, 
    message: MessageData
  ): Promise<void>
  
  /**
   * Validate that a connection is still active and accessible
   * @param connection - Connection to validate
   * @returns Promise resolving to validation result
   */
  validateConnection(
    connection: NoteIntegrationConnection & { integration: Integration }
  ): Promise<boolean>
  
  /**
   * Get provider-specific configuration schema
   * @returns Configuration schema for this provider
   */
  getConfigSchema(): Record<string, any>
}

/**
 * Base abstract class providing common functionality for integration providers
 */
export abstract class BaseIntegrationProvider implements IntegrationProvider {
  abstract readonly name: string
  abstract readonly type: ProviderType
  abstract readonly displayName: string
  abstract readonly description: string
  abstract readonly logoPath: string

  // Abstract methods that must be implemented by concrete providers
  abstract getAuthUrl(
    organizationId: string, 
    redirectUri: string,
    additionalParams?: Record<string, any>
  ): Promise<string>
  
  abstract handleCallback(params: OAuthCallbackParams): Promise<TokenData>
  abstract refreshToken(refreshToken: string): Promise<TokenData>
  abstract getAvailableChannels(integration: Integration): Promise<Channel[]>
  abstract postMessage(
    connection: NoteIntegrationConnection & { integration: Integration }, 
    message: MessageData
  ): Promise<void>
  abstract validateConnection(
    connection: NoteIntegrationConnection & { integration: Integration }
  ): Promise<boolean>
  abstract getConfigSchema(): Record<string, any>

  // Common utility methods
  
  /**
   * Generate a secure random state string for OAuth
   * @param organizationId - Organization ID
   * @param additionalData - Additional data to include in state
   * @returns Base64 encoded state string
   */
  protected generateOAuthState(
    organizationId: string, 
    additionalData?: Record<string, any>
  ): string {
    const stateData = {
      organizationId,
      providerName: this.name,
      timestamp: Date.now(),
      ...additionalData,
    }
    
    return Buffer.from(JSON.stringify(stateData)).toString('base64')
  }
  
  /**
   * Parse and validate OAuth state
   * @param state - Base64 encoded state string
   * @returns Parsed state data
   * @throws Error if state is invalid or expired
   */
  protected parseOAuthState(state: string): {
    organizationId: string
    providerName: string
    timestamp: number
    [key: string]: any
  } {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString()) as any
      
      // Validate state structure
      if (!stateData?.organizationId || !stateData?.providerName || !stateData?.timestamp) {
        throw new Error('Invalid state structure')
      }
      
      // Check if state is expired (30 minutes)
      const maxAge = 30 * 60 * 1000 // 30 minutes in milliseconds
      if (Date.now() - stateData.timestamp > maxAge) {
        throw new Error('OAuth state expired')
      }
      
      // Validate provider name matches
      if (stateData.providerName !== this.name) {
        throw new Error('Provider name mismatch in state')
      }
      
      return stateData as {
        organizationId: string
        providerName: string
        timestamp: number
        [key: string]: any
      }
    } catch (error) {
      throw new Error(`Invalid OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  /**
   * Check if a token is expired or about to expire
   * @param expiresAt - Token expiration date
   * @param bufferMinutes - Minutes before expiration to consider expired
   * @returns True if token is expired or about to expire
   */
  protected isTokenExpired(expiresAt?: Date, bufferMinutes: number = 5): boolean {
    if (!expiresAt) return false
    
    const bufferMs = bufferMinutes * 60 * 1000
    return Date.now() >= (expiresAt.getTime() - bufferMs)
  }
  
  /**
   * Make an authenticated HTTP request to the provider's API
   * @param integration - Integration with credentials
   * @param endpoint - API endpoint
   * @param options - Fetch options
   * @returns Promise resolving to response
   */
  protected async makeAuthenticatedRequest(
    integration: Integration,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    // This will be implemented with token decryption in a later task
    throw new Error('makeAuthenticatedRequest not yet implemented - requires token encryption utilities')
  }
  
  /**
   * Handle API errors and convert to appropriate error types
   * @param response - HTTP response
   * @param context - Error context for logging
   */
  protected async handleApiError(response: Response, context: string): Promise<never> {
    const errorText = await response.text()
    let errorMessage = `${context}: ${response.status} ${response.statusText}`
    
    try {
      const errorData = JSON.parse(errorText) as any
      if (errorData?.error || errorData?.message) {
        errorMessage += ` - ${errorData.error || errorData.message}`
      }
    } catch {
      // If response is not JSON, include raw text
      if (errorText) {
        errorMessage += ` - ${errorText}`
      }
    }
    
    throw new Error(errorMessage)
  }
}

/**
 * Registry for managing integration providers
 */
export class ProviderRegistry {
  private providers = new Map<string, IntegrationProvider>()
  
  /**
   * Register a new integration provider
   * @param provider - Provider instance to register
   */
  register(provider: IntegrationProvider): void {
    this.providers.set(provider.name, provider)
  }
  
  /**
   * Get a provider by name
   * @param name - Provider name
   * @returns Provider instance
   * @throws Error if provider not found
   */
  get(name: string): IntegrationProvider {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Integration provider '${name}' not found`)
    }
    return provider
  }
  
  /**
   * Get all registered providers
   * @returns Array of all providers
   */
  getAll(): IntegrationProvider[] {
    return Array.from(this.providers.values())
  }
  
  /**
   * Get providers by type
   * @param type - Provider type to filter by
   * @returns Array of providers matching the type
   */
  getByType(type: ProviderType): IntegrationProvider[] {
    return this.getAll().filter(provider => provider.type === type)
  }
  
  /**
   * Check if a provider is registered
   * @param name - Provider name
   * @returns True if provider is registered
   */
  has(name: string): boolean {
    return this.providers.has(name)
  }
  
  /**
   * Unregister a provider
   * @param name - Provider name to unregister
   */
  unregister(name: string): void {
    this.providers.delete(name)
  }
}

// Global provider registry instance
export const providerRegistry = new ProviderRegistry()