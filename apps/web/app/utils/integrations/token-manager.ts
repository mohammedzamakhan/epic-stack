/**
 * Token management service for secure storage, retrieval, and validation
 * of OAuth tokens for third-party integrations
 */

import { prisma } from '#app/utils/db.server'
import type { Integration } from '@prisma/client'
import { integrationEncryption, type EncryptedTokenData, type TokenValidationResult } from './encryption'
import type { TokenData, IntegrationProvider } from './types'

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  success: boolean
  tokenData?: TokenData
  error?: string
  requiresReauth?: boolean
}

/**
 * Token storage result
 */
export interface TokenStorageResult {
  success: boolean
  error?: string
}

/**
 * Token manager service for handling secure token operations
 */
export class TokenManager {
  /**
   * Store encrypted token data for an integration
   */
  async storeTokenData(
    integrationId: string,
    tokenData: TokenData
  ): Promise<TokenStorageResult> {
    try {
      // Encrypt the token data
      const encryptedData = await integrationEncryption.encryptTokenData(tokenData)

      // Store in database
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          accessToken: encryptedData.encryptedAccessToken,
          refreshToken: encryptedData.encryptedRefreshToken,
          tokenExpiresAt: encryptedData.expiresAt,
          lastSyncAt: new Date(),
          isActive: true,
        },
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to store token data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Retrieve and decrypt token data for an integration
   */
  async getTokenData(integrationId: string): Promise<TokenData | null> {
    try {
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        select: {
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          config: true,
        },
      })

      if (!integration?.accessToken) {
        return null
      }

      // Reconstruct encrypted data structure
      const encryptedData: EncryptedTokenData = {
        encryptedAccessToken: integration.accessToken,
        encryptedRefreshToken: integration.refreshToken || undefined,
        expiresAt: integration.tokenExpiresAt || undefined,
        scope: (integration.config as any)?.scope,
        iv: '', // Will be extracted from encrypted data
      }

      // Decrypt and return token data
      return await integrationEncryption.decryptTokenData(encryptedData)
    } catch (error) {
      console.error('Failed to retrieve token data:', error)
      return null
    }
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(
    integration: Integration,
    provider: IntegrationProvider
  ): Promise<string | null> {
    try {
      const tokenData = await this.getTokenData(integration.id)
      if (!tokenData) {
        return null
      }

      // Validate token
      const validation = integrationEncryption.validateToken(tokenData)
      
      if (validation.isValid && !validation.needsRefresh) {
        return tokenData.accessToken
      }

      // Token needs refresh or is expired
      if (tokenData.refreshToken && provider.refreshToken) {
        const refreshResult = await this.refreshToken(integration, provider, tokenData.refreshToken)
        
        if (refreshResult.success && refreshResult.tokenData) {
          return refreshResult.tokenData.accessToken
        }
      }

      // Token refresh failed or no refresh token available
      return null
    } catch (error) {
      console.error('Failed to get valid access token:', error)
      return null
    }
  }

  /**
   * Refresh an expired or expiring token
   */
  async refreshToken(
    integration: Integration,
    provider: IntegrationProvider,
    refreshToken: string
  ): Promise<TokenRefreshResult> {
    try {
      if (!provider.refreshToken) {
        return {
          success: false,
          error: 'Provider does not support token refresh',
          requiresReauth: true,
        }
      }

      // Attempt to refresh the token
      const newTokenData = await provider.refreshToken(refreshToken)

      // Store the new token data
      const storeResult = await this.storeTokenData(integration.id, newTokenData)
      
      if (!storeResult.success) {
        return {
          success: false,
          error: `Failed to store refreshed token: ${storeResult.error}`,
        }
      }

      // Log successful refresh
      await this.logTokenOperation(integration.id, 'token_refresh', 'success')

      return {
        success: true,
        tokenData: newTokenData,
      }
    } catch (error) {
      // Log failed refresh
      await this.logTokenOperation(
        integration.id,
        'token_refresh',
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      )

      // Determine if this requires re-authentication
      const requiresReauth = this.isReauthError(error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
        requiresReauth,
      }
    }
  }

  /**
   * Validate token and return validation result
   */
  async validateIntegrationToken(integrationId: string): Promise<TokenValidationResult | null> {
    try {
      const tokenData = await this.getTokenData(integrationId)
      if (!tokenData) {
        return null
      }

      return integrationEncryption.validateToken(tokenData)
    } catch (error) {
      console.error('Failed to validate token:', error)
      return null
    }
  }

  /**
   * Check if multiple integrations need token refresh
   */
  async checkTokensNeedingRefresh(organizationId: string): Promise<string[]> {
    try {
      const integrations = await prisma.integration.findMany({
        where: {
          organizationId,
          isActive: true,
          tokenExpiresAt: {
            not: null,
          },
        },
        select: {
          id: true,
          tokenExpiresAt: true,
        },
      })

      const needingRefresh: string[] = []
      const now = new Date()
      const refreshThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds

      for (const integration of integrations) {
        if (integration.tokenExpiresAt) {
          const timeUntilExpiry = integration.tokenExpiresAt.getTime() - now.getTime()
          if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
            needingRefresh.push(integration.id)
          }
        }
      }

      return needingRefresh
    } catch (error) {
      console.error('Failed to check tokens needing refresh:', error)
      return []
    }
  }

  /**
   * Revoke and remove token data for an integration
   */
  async revokeToken(integrationId: string, provider?: IntegrationProvider): Promise<boolean> {
    try {
      // Get current token data
      const tokenData = await this.getTokenData(integrationId)

      // Attempt to revoke with provider if supported
      if (tokenData && provider?.revokeToken) {
        try {
          await provider.revokeToken(tokenData.accessToken)
        } catch (error) {
          console.warn('Failed to revoke token with provider:', error)
          // Continue with local cleanup even if provider revocation fails
        }
      }

      // Clear token data from database
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isActive: false,
        },
      })

      // Log revocation
      await this.logTokenOperation(integrationId, 'token_revoke', 'success')

      return true
    } catch (error) {
      console.error('Failed to revoke token:', error)
      await this.logTokenOperation(
        integrationId,
        'token_revoke',
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      )
      return false
    }
  }

  /**
   * Log token-related operations
   */
  private async logTokenOperation(
    integrationId: string,
    action: string,
    status: 'success' | 'error',
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.integrationLog.create({
        data: {
          integrationId,
          action,
          status,
          errorMessage,
          requestData: null,
          responseData: null,
        },
      })
    } catch (error) {
      console.error('Failed to log token operation:', error)
    }
  }

  /**
   * Determine if an error requires re-authentication
   */
  private isReauthError(error: any): boolean {
    if (!error) return false

    const errorMessage = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status

    // Common error patterns that indicate need for re-authentication
    const reauthPatterns = [
      'invalid_grant',
      'invalid_token',
      'token_revoked',
      'authorization_revoked',
      'account_inactive',
      'invalid_refresh_token',
    ]

    const reauthCodes = [401, 403]

    return (
      reauthPatterns.some(pattern => errorMessage.includes(pattern)) ||
      reauthCodes.includes(errorCode)
    )
  }
}

/**
 * Singleton instance of the token manager
 */
export const tokenManager = new TokenManager()