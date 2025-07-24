/**
 * Tests for TokenManager
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tokenManager, TokenManager, type TokenRefreshResult, type TokenStorageResult } from '../../src/token-manager'
import { integrationEncryption } from '../../src/encryption'
import { prisma } from '@repo/prisma'
import type { Integration } from '@prisma/client'
import type { IntegrationProvider, TokenData } from '../../src/types'

// Mock dependencies
vi.mock('@repo/prisma', () => ({
  prisma: {
    integration: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    integrationLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../../src/encryption', () => ({
  integrationEncryption: {
    encryptTokenData: vi.fn(),
    decryptTokenData: vi.fn(),
    validateToken: vi.fn(),
  },
}))

describe('TokenManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('storeTokenData', () => {
    it('should store token data successfully', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        scope: 'read write',
      }

      const encryptedData = {
        encryptedAccessToken: 'encrypted-access',
        encryptedRefreshToken: 'encrypted-refresh',
        expiresAt: tokenData.expiresAt,
        scope: tokenData.scope,
        iv: 'test-iv',
      }

      vi.mocked(integrationEncryption.encryptTokenData).mockResolvedValue(encryptedData)
      vi.mocked(prisma.integration.update).mockResolvedValue({} as any)

      const result = await tokenManager.storeTokenData('integration-123', tokenData)

      expect(result.success).toBe(true)
      expect(integrationEncryption.encryptTokenData).toHaveBeenCalledWith(tokenData)
      expect(prisma.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-123' },
        data: {
          accessToken: 'encrypted-access',
          refreshToken: 'encrypted-refresh',
          tokenExpiresAt: tokenData.expiresAt,
          lastSyncAt: expect.any(Date),
          isActive: true,
        },
      })
    })

    it('should handle encryption errors', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
      }

      vi.mocked(integrationEncryption.encryptTokenData).mockRejectedValue(new Error('Encryption failed'))

      const result = await tokenManager.storeTokenData('integration-123', tokenData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Encryption failed')
    })

    it('should handle database errors', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
      }

      const encryptedData = {
        encryptedAccessToken: 'encrypted-access',
        iv: 'test-iv',
      }

      vi.mocked(integrationEncryption.encryptTokenData).mockResolvedValue(encryptedData)
      vi.mocked(prisma.integration.update).mockRejectedValue(new Error('Database error'))

      const result = await tokenManager.storeTokenData('integration-123', tokenData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('getTokenData', () => {
    it('should retrieve and decrypt token data successfully', async () => {
      const mockIntegration = {
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiresAt: new Date(),
        config: { scope: 'read write' },
      }

      const decryptedTokenData: TokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: mockIntegration.tokenExpiresAt,
        scope: 'read write',
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(decryptedTokenData)

      const result = await tokenManager.getTokenData('integration-123')

      expect(result).toEqual(decryptedTokenData)
      expect(prisma.integration.findUnique).toHaveBeenCalledWith({
        where: { id: 'integration-123' },
        select: {
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          config: true,
        },
      })
    })

    it('should return null when integration not found', async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(null)

      const result = await tokenManager.getTokenData('integration-123')

      expect(result).toBeNull()
    })

    it('should return null when no access token', async () => {
      const mockIntegration = {
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        config: {},
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)

      const result = await tokenManager.getTokenData('integration-123')

      expect(result).toBeNull()
    })

    it('should handle decryption errors', async () => {
      const mockIntegration = {
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiresAt: new Date(),
        config: {},
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockRejectedValue(new Error('Decryption failed'))

      const result = await tokenManager.getTokenData('integration-123')

      expect(result).toBeNull()
    })
  })

  describe('getValidAccessToken', () => {
    const mockIntegration: Integration = {
      id: 'integration-123',
      organizationId: 'org-123',
      providerName: 'slack',
      accessToken: 'encrypted-access',
      refreshToken: 'encrypted-refresh',
      tokenExpiresAt: new Date(),
      config: {},
      isActive: true,
      lastSyncAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockProvider: IntegrationProvider = {
      name: 'slack',
      type: 'productivity',
      getAuthUrl: vi.fn(),
      handleCallback: vi.fn(),
      refreshToken: vi.fn(),
      getAvailableChannels: vi.fn(),
      postMessage: vi.fn(),
      validateConnection: vi.fn(),
    }

    it('should return valid access token without refresh', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiresAt: tokenData.expiresAt,
        config: {},
      } as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(tokenData)
      vi.mocked(integrationEncryption.validateToken).mockReturnValue({
        isValid: true,
        needsRefresh: false,
        expiresAt: tokenData.expiresAt,
        timeUntilExpiry: 3600000,
      })

      const result = await tokenManager.getValidAccessToken(mockIntegration, mockProvider)

      expect(result).toBe('access-token')
      expect(mockProvider.refreshToken).not.toHaveBeenCalled()
    })

    it('should refresh token when needed', async () => {
      const tokenData: TokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
      }

      const newTokenData: TokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }

      const encryptedData = {
        encryptedAccessToken: 'encrypted-new-access',
        encryptedRefreshToken: 'encrypted-new-refresh',
        expiresAt: newTokenData.expiresAt,
        iv: 'test-iv',
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiresAt: tokenData.expiresAt,
        config: {},
      } as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(tokenData)
      vi.mocked(integrationEncryption.validateToken).mockReturnValue({
        isValid: true,
        needsRefresh: true,
        expiresAt: tokenData.expiresAt,
        timeUntilExpiry: 300000,
      })
      vi.mocked(mockProvider.refreshToken).mockResolvedValue(newTokenData)
      vi.mocked(integrationEncryption.encryptTokenData).mockResolvedValue(encryptedData)
      vi.mocked(prisma.integration.update).mockResolvedValue({} as any)
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const result = await tokenManager.getValidAccessToken(mockIntegration, mockProvider)

      expect(result).toBe('new-access-token')
      expect(mockProvider.refreshToken).toHaveBeenCalledWith('refresh-token')
    })

    it('should return null when token is invalid and no refresh token', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        // No refresh token
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        accessToken: 'encrypted-access',
        refreshToken: null,
        tokenExpiresAt: new Date(),
        config: {},
      } as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(tokenData)
      vi.mocked(integrationEncryption.validateToken).mockReturnValue({
        isValid: false,
        needsRefresh: false,
        expiresAt: new Date(),
        timeUntilExpiry: -1000,
      })

      const result = await tokenManager.getValidAccessToken(mockIntegration, mockProvider)

      expect(result).toBeNull()
    })

    it('should return null when token data not found', async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(null)

      const result = await tokenManager.getValidAccessToken(mockIntegration, mockProvider)

      expect(result).toBeNull()
    })

    it('should handle refresh token failure', async () => {
      const tokenData: TokenData = {
        accessToken: 'old-access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 300000),
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiresAt: tokenData.expiresAt,
        config: {},
      } as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(tokenData)
      vi.mocked(integrationEncryption.validateToken).mockReturnValue({
        isValid: true,
        needsRefresh: true,
        expiresAt: tokenData.expiresAt,
        timeUntilExpiry: 300000,
      })
      vi.mocked(mockProvider.refreshToken).mockRejectedValue(new Error('Refresh failed'))
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const result = await tokenManager.getValidAccessToken(mockIntegration, mockProvider)

      expect(result).toBeNull()
    })
  })

  describe('refreshToken', () => {
    const mockIntegration: Integration = {
      id: 'integration-123',
      organizationId: 'org-123',
      providerName: 'slack',
      accessToken: 'encrypted-access',
      refreshToken: 'encrypted-refresh',
      tokenExpiresAt: new Date(),
      config: {},
      isActive: true,
      lastSyncAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockProvider: IntegrationProvider = {
      name: 'slack',
      type: 'productivity',
      getAuthUrl: vi.fn(),
      handleCallback: vi.fn(),
      refreshToken: vi.fn(),
      getAvailableChannels: vi.fn(),
      postMessage: vi.fn(),
      validateConnection: vi.fn(),
    }

    it('should refresh token successfully', async () => {
      const newTokenData: TokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }

      const encryptedData = {
        encryptedAccessToken: 'encrypted-new-access',
        encryptedRefreshToken: 'encrypted-new-refresh',
        expiresAt: newTokenData.expiresAt,
        iv: 'test-iv',
      }

      vi.mocked(mockProvider.refreshToken).mockResolvedValue(newTokenData)
      vi.mocked(integrationEncryption.encryptTokenData).mockResolvedValue(encryptedData)
      vi.mocked(prisma.integration.update).mockResolvedValue({} as any)
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const result = await tokenManager.refreshToken(mockIntegration, mockProvider, 'refresh-token')

      expect(result.success).toBe(true)
      expect(result.tokenData).toEqual(newTokenData)
      expect(mockProvider.refreshToken).toHaveBeenCalledWith('refresh-token')
    })

    it('should handle provider without refresh support', async () => {
      const providerWithoutRefresh: IntegrationProvider = {
        ...mockProvider,
        refreshToken: undefined,
      }

      const result = await tokenManager.refreshToken(mockIntegration, providerWithoutRefresh, 'refresh-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Provider does not support token refresh')
      expect(result.requiresReauth).toBe(true)
    })

    it('should handle refresh token failure', async () => {
      vi.mocked(mockProvider.refreshToken).mockRejectedValue(new Error('invalid_grant'))
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const result = await tokenManager.refreshToken(mockIntegration, mockProvider, 'refresh-token')

      expect(result.success).toBe(false)
      expect(result.error).toBe('invalid_grant')
      expect(result.requiresReauth).toBe(true)
    })

    it('should handle storage failure after successful refresh', async () => {
      const newTokenData: TokenData = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
      }

      vi.mocked(mockProvider.refreshToken).mockResolvedValue(newTokenData)
      vi.mocked(integrationEncryption.encryptTokenData).mockRejectedValue(new Error('Storage failed'))

      const result = await tokenManager.refreshToken(mockIntegration, mockProvider, 'refresh-token')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to store refreshed token')
    })
  })

  describe('validateIntegrationToken', () => {
    it('should validate token successfully', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
        expiresAt: new Date(Date.now() + 3600000),
      }

      const validationResult = {
        isValid: true,
        needsRefresh: false,
        expiresAt: tokenData.expiresAt,
        timeUntilExpiry: 3600000,
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        accessToken: 'encrypted-access',
        refreshToken: null,
        tokenExpiresAt: tokenData.expiresAt,
        config: {},
      } as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(tokenData)
      vi.mocked(integrationEncryption.validateToken).mockReturnValue(validationResult)

      const result = await tokenManager.validateIntegrationToken('integration-123')

      expect(result).toEqual(validationResult)
    })

    it('should return null when no token data', async () => {
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(null)

      const result = await tokenManager.validateIntegrationToken('integration-123')

      expect(result).toBeNull()
    })

    it('should handle validation errors', async () => {
      vi.mocked(prisma.integration.findUnique).mockRejectedValue(new Error('Database error'))

      const result = await tokenManager.validateIntegrationToken('integration-123')

      expect(result).toBeNull()
    })
  })

  describe('checkTokensNeedingRefresh', () => {
    it('should identify tokens needing refresh', async () => {
      const now = new Date()
      const soonToExpire = new Date(now.getTime() + 4 * 60 * 1000) // 4 minutes from now
      const notExpiring = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now

      const mockIntegrations = [
        { id: 'int-1', tokenExpiresAt: soonToExpire },
        { id: 'int-2', tokenExpiresAt: notExpiring },
        { id: 'int-3', tokenExpiresAt: new Date(now.getTime() - 1000) }, // Already expired
      ]

      vi.mocked(prisma.integration.findMany).mockResolvedValue(mockIntegrations as any)

      const result = await tokenManager.checkTokensNeedingRefresh('org-123')

      expect(result).toEqual(['int-1'])
      expect(prisma.integration.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
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
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.integration.findMany).mockRejectedValue(new Error('Database error'))

      const result = await tokenManager.checkTokensNeedingRefresh('org-123')

      expect(result).toEqual([])
    })
  })

  describe('revokeToken', () => {
    const mockProvider: IntegrationProvider = {
      name: 'slack',
      type: 'productivity',
      getAuthUrl: vi.fn(),
      handleCallback: vi.fn(),
      revokeToken: vi.fn(),
      getAvailableChannels: vi.fn(),
      postMessage: vi.fn(),
      validateConnection: vi.fn(),
    }

    it('should revoke token successfully', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        accessToken: 'encrypted-access',
        refreshToken: null,
        tokenExpiresAt: null,
        config: {},
      } as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(tokenData)
      vi.mocked(mockProvider.revokeToken).mockResolvedValue()
      vi.mocked(prisma.integration.update).mockResolvedValue({} as any)
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const result = await tokenManager.revokeToken('integration-123', mockProvider)

      expect(result).toBe(true)
      expect(mockProvider.revokeToken).toHaveBeenCalledWith('access-token')
      expect(prisma.integration.update).toHaveBeenCalledWith({
        where: { id: 'integration-123' },
        data: {
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          isActive: false,
        },
      })
    })

    it('should continue with local cleanup when provider revocation fails', async () => {
      const tokenData: TokenData = {
        accessToken: 'access-token',
      }

      vi.mocked(prisma.integration.findUnique).mockResolvedValue({
        accessToken: 'encrypted-access',
        refreshToken: null,
        tokenExpiresAt: null,
        config: {},
      } as any)
      vi.mocked(integrationEncryption.decryptTokenData).mockResolvedValue(tokenData)
      vi.mocked(mockProvider.revokeToken).mockRejectedValue(new Error('Provider revocation failed'))
      vi.mocked(prisma.integration.update).mockResolvedValue({} as any)
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await tokenManager.revokeToken('integration-123', mockProvider)

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to revoke token with provider:', expect.any(Error))
      expect(prisma.integration.update).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should work without provider', async () => {
      vi.mocked(prisma.integration.update).mockResolvedValue({} as any)
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const result = await tokenManager.revokeToken('integration-123')

      expect(result).toBe(true)
      expect(prisma.integration.update).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      vi.mocked(prisma.integration.update).mockRejectedValue(new Error('Database error'))
      vi.mocked(prisma.integrationLog.create).mockResolvedValue({} as any)

      const result = await tokenManager.revokeToken('integration-123')

      expect(result).toBe(false)
    })
  })

  describe('isReauthError', () => {
    const manager = new TokenManager()

    it('should identify reauth errors by message', () => {
      const error = new Error('invalid_grant')
      const result = (manager as any).isReauthError(error)
      expect(result).toBe(true)
    })

    it('should identify reauth errors by status code', () => {
      const error = { status: 401 }
      const result = (manager as any).isReauthError(error)
      expect(result).toBe(true)
    })

    it('should not identify non-reauth errors', () => {
      const error = new Error('network_error')
      const result = (manager as any).isReauthError(error)
      expect(result).toBe(false)
    })

    it('should handle null/undefined errors', () => {
      expect((manager as any).isReauthError(null)).toBe(false)
      expect((manager as any).isReauthError(undefined)).toBe(false)
    })
  })
})