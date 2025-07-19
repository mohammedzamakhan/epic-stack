/**
 * OAuth flow management system for third-party integrations
 * 
 * This module provides utilities for managing OAuth flows including:
 * - State generation and validation
 * - Generic OAuth callback handling
 * - Token refresh with retry logic
 */

import { randomBytes, createHash } from 'crypto'
import type { TokenData, OAuthState, OAuthCallbackParams } from './types'
import type { IntegrationProvider } from './provider'
import { providerRegistry } from './provider'

/**
 * OAuth state management utilities
 */
export class OAuthStateManager {
  private static readonly STATE_EXPIRY_MINUTES = 30
  private static readonly STATE_SECRET = process.env.OAUTH_STATE_SECRET || 'default-oauth-secret'

  /**
   * Generate a secure OAuth state string
   * @param organizationId - Organization ID
   * @param providerName - Provider name
   * @param redirectUrl - Optional redirect URL after OAuth completion
   * @param additionalData - Additional data to include in state
   * @returns Secure state string
   */
  static generateState(
    organizationId: string,
    providerName: string,
    redirectUrl?: string,
    additionalData?: Record<string, any>
  ): string {
    const stateData: OAuthState = {
      organizationId,
      providerName,
      redirectUrl,
      timestamp: Date.now(),
      nonce: randomBytes(16).toString('hex'),
      ...additionalData,
    }

    // Create state payload
    const statePayload = Buffer.from(JSON.stringify(stateData)).toString('base64')
    
    // Create signature to prevent tampering
    const signature = this.createStateSignature(statePayload)
    
    // Combine payload and signature
    return `${statePayload}.${signature}`
  }

  /**
   * Validate and parse OAuth state
   * @param state - State string to validate
   * @returns Parsed state data
   * @throws Error if state is invalid or expired
   */
  static validateState(state: string): OAuthState {
    if (!state || typeof state !== 'string') {
      throw new Error('Invalid state: empty or non-string')
    }

    const parts = state.split('.')
    if (parts.length !== 2) {
      throw new Error('Invalid state: malformed structure')
    }

    const [statePayload, signature] = parts

    // Verify signature
    const expectedSignature = this.createStateSignature(statePayload)
    if (signature !== expectedSignature) {
      throw new Error('Invalid state: signature verification failed')
    }

    // Parse state data
    let stateData: OAuthState
    try {
      const decoded = Buffer.from(statePayload, 'base64').toString()
      stateData = JSON.parse(decoded) as OAuthState
    } catch (error) {
      throw new Error('Invalid state: failed to parse data')
    }

    // Validate required fields
    if (!stateData.organizationId || !stateData.providerName || !stateData.timestamp) {
      throw new Error('Invalid state: missing required fields')
    }

    // Check expiration
    const maxAge = this.STATE_EXPIRY_MINUTES * 60 * 1000
    if (Date.now() - stateData.timestamp > maxAge) {
      throw new Error('Invalid state: expired')
    }

    return stateData
  }

  /**
   * Create HMAC signature for state payload
   * @param payload - State payload to sign
   * @returns Signature string
   */
  private static createStateSignature(payload: string): string {
    return createHash('sha256')
      .update(payload + this.STATE_SECRET)
      .digest('hex')
  }
}

/**
 * Generic OAuth callback handler
 */
export class OAuthCallbackHandler {
  /**
   * Handle OAuth callback from provider
   * @param providerName - Name of the provider
   * @param params - OAuth callback parameters
   * @returns Token data from successful OAuth flow
   * @throws Error if callback handling fails
   */
  static async handleCallback(
    providerName: string,
    params: OAuthCallbackParams
  ): Promise<{
    tokenData: TokenData
    stateData: OAuthState
  }> {
    // Check for OAuth errors
    if (params.error) {
      const errorMsg = params.errorDescription || params.error
      throw new Error(`OAuth error: ${errorMsg}`)
    }

    // Validate required parameters
    if (!params.code || !params.state) {
      throw new Error('Missing required OAuth parameters: code or state')
    }

    // Validate state
    const stateData = OAuthStateManager.validateState(params.state)

    // Verify provider name matches
    if (stateData.providerName !== providerName) {
      throw new Error('Provider name mismatch in OAuth state')
    }

    // Verify organization ID matches (if provided in params)
    if (params.organizationId && stateData.organizationId !== params.organizationId) {
      throw new Error('Organization ID mismatch in OAuth state')
    }

    // Get provider and handle callback
    const provider = providerRegistry.get(providerName)
    const tokenData = await provider.handleCallback(params)

    return {
      tokenData,
      stateData,
    }
  }

  /**
   * Generate OAuth authorization URL
   * @param organizationId - Organization ID
   * @param providerName - Provider name
   * @param redirectUri - OAuth callback URI
   * @param additionalParams - Additional provider-specific parameters
   * @returns Authorization URL
   */
  static async generateAuthUrl(
    organizationId: string,
    providerName: string,
    redirectUri: string,
    additionalParams?: Record<string, any>
  ): Promise<string> {
    const provider = providerRegistry.get(providerName)
    return provider.getAuthUrl(organizationId, redirectUri, additionalParams)
  }
}

/**
 * Token refresh manager with retry logic
 */
export class TokenRefreshManager {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff in ms
  private static readonly TOKEN_BUFFER_MINUTES = 5 // Refresh tokens 5 minutes before expiry

  /**
   * Refresh token with retry logic
   * @param providerName - Provider name
   * @param refreshToken - Refresh token
   * @param attempt - Current attempt number (for internal use)
   * @returns New token data
   * @throws Error if all retry attempts fail
   */
  static async refreshTokenWithRetry(
    providerName: string,
    refreshToken: string,
    attempt: number = 1
  ): Promise<TokenData> {
    const provider = providerRegistry.get(providerName)

    if (!provider.refreshToken) {
      throw new Error(`Provider ${providerName} does not support token refresh`)
    }

    try {
      const tokenData = await provider.refreshToken(refreshToken)
      
      // Validate token data
      if (!tokenData.accessToken) {
        throw new Error('Invalid token data: missing access token')
      }

      return tokenData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Check if we should retry
      if (attempt < this.MAX_RETRIES && this.isRetryableError(error)) {
        const delay = this.RETRY_DELAYS[attempt - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1]
        
        console.warn(`Token refresh attempt ${attempt} failed for ${providerName}: ${errorMessage}. Retrying in ${delay}ms...`)
        
        await this.delay(delay)
        return this.refreshTokenWithRetry(providerName, refreshToken, attempt + 1)
      }

      // All retries exhausted or non-retryable error
      throw new Error(`Token refresh failed for ${providerName} after ${attempt} attempts: ${errorMessage}`)
    }
  }

  /**
   * Check if a token needs to be refreshed
   * @param tokenData - Current token data
   * @returns True if token should be refreshed
   */
  static shouldRefreshToken(tokenData: TokenData): boolean {
    if (!tokenData.expiresAt) {
      // If no expiry date, assume token doesn't expire
      return false
    }

    const bufferMs = this.TOKEN_BUFFER_MINUTES * 60 * 1000
    const refreshTime = tokenData.expiresAt.getTime() - bufferMs
    
    return Date.now() >= refreshTime
  }

  /**
   * Check if a token is completely expired
   * @param tokenData - Token data to check
   * @returns True if token is expired
   */
  static isTokenExpired(tokenData: TokenData): boolean {
    if (!tokenData.expiresAt) {
      return false
    }

    return Date.now() >= tokenData.expiresAt.getTime()
  }

  /**
   * Determine if an error is retryable
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private static isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false
    }

    const message = error.message.toLowerCase()
    
    // Network-related errors that might be temporary
    const retryablePatterns = [
      'network',
      'timeout',
      'connection',
      'econnreset',
      'enotfound',
      'econnrefused',
      'socket hang up',
      'rate limit',
      'too many requests',
      'service unavailable',
      'internal server error',
      'bad gateway',
      'gateway timeout',
    ]

    return retryablePatterns.some(pattern => message.includes(pattern))
  }

  /**
   * Delay execution for specified milliseconds
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * OAuth flow orchestrator that combines all OAuth management utilities
 */
export class OAuthFlowManager {
  /**
   * Start OAuth flow for a provider
   * @param organizationId - Organization ID
   * @param providerName - Provider name
   * @param redirectUri - OAuth callback URI
   * @param additionalParams - Additional parameters
   * @returns Object containing auth URL and state
   */
  static async startOAuthFlow(
    organizationId: string,
    providerName: string,
    redirectUri: string,
    additionalParams?: Record<string, any>
  ): Promise<{
    authUrl: string
    state: string
  }> {
    // Generate state
    const state = OAuthStateManager.generateState(
      organizationId,
      providerName,
      additionalParams?.redirectUrl,
      additionalParams
    )

    // Get authorization URL from provider
    const authUrl = await OAuthCallbackHandler.generateAuthUrl(
      organizationId,
      providerName,
      redirectUri,
      { ...additionalParams, state }
    )

    return {
      authUrl,
      state,
    }
  }

  /**
   * Complete OAuth flow by handling callback
   * @param providerName - Provider name
   * @param params - OAuth callback parameters
   * @returns Token data and state information
   */
  static async completeOAuthFlow(
    providerName: string,
    params: OAuthCallbackParams
  ): Promise<{
    tokenData: TokenData
    stateData: OAuthState
  }> {
    return OAuthCallbackHandler.handleCallback(providerName, params)
  }

  /**
   * Refresh token if needed
   * @param providerName - Provider name
   * @param currentTokenData - Current token data
   * @returns Refreshed token data or original if refresh not needed
   */
  static async ensureValidToken(
    providerName: string,
    currentTokenData: TokenData
  ): Promise<TokenData> {
    if (!TokenRefreshManager.shouldRefreshToken(currentTokenData)) {
      return currentTokenData
    }

    if (!currentTokenData.refreshToken) {
      throw new Error('Token needs refresh but no refresh token available')
    }

    return TokenRefreshManager.refreshTokenWithRetry(
      providerName,
      currentTokenData.refreshToken
    )
  }
}

// All utilities are exported above with their class definitions