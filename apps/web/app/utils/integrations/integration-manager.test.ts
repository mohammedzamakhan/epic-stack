/**
 * Integration Manager Tests
 * 
 * Tests for the core IntegrationManager functionality including
 * provider registry, CRUD operations, and connection management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { IntegrationProvider } from './provider'
import { IntegrationManager } from './integration-manager'
import type { ProviderType, TokenData, Channel, MessageData } from './types'

// Mock provider for testing
class MockProvider implements IntegrationProvider {
  readonly name = 'mock'
  readonly type: ProviderType = 'productivity'
  readonly displayName = 'Mock Provider'
  readonly description = 'Mock provider for testing'
  readonly logoPath = '/mock-logo.png'

  async getAuthUrl(organizationId: string, redirectUri: string): Promise<string> {
    return `https://mock.com/oauth?org=${organizationId}&redirect=${encodeURIComponent(redirectUri)}`
  }

  async handleCallback(params: any): Promise<TokenData> {
    return {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      scope: 'read,write'
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenData> {
    return {
      accessToken: 'new-mock-access-token',
      refreshToken: 'new-mock-refresh-token',
      expiresAt: new Date(Date.now() + 3600000),
      scope: 'read,write'
    }
  }

  async getAvailableChannels(integration: any): Promise<Channel[]> {
    return [
      { id: 'channel1', name: 'General', type: 'public' },
      { id: 'channel2', name: 'Private Channel', type: 'private' }
    ]
  }

  async postMessage(connection: any, message: MessageData): Promise<void> {
    // Mock implementation - just log the message
    console.log('Mock posting message:', message.title, 'to channel:', connection.externalId)
  }

  async validateConnection(connection: any): Promise<boolean> {
    return true // Mock always returns valid
  }

  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        apiKey: { type: 'string' },
        webhookUrl: { type: 'string' }
      }
    }
  }
}

// Mock Prisma
vi.mock('../db.server', () => ({
  prisma: {
    integration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    noteIntegrationConnection: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    organizationNote: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    integrationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    }
  }
}))

// Mock encryption
vi.mock('./encryption', () => ({
  encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
  decryptToken: vi.fn().mockResolvedValue('decrypted-token'),
}))

// Mock OAuth manager
vi.mock('./oauth-manager', () => ({
  OAuthStateManager: {
    generateState: vi.fn().mockReturnValue('mock-state'),
    validateState: vi.fn().mockReturnValue({
      organizationId: 'org-123',
      providerName: 'mock',
      timestamp: Date.now(),
      additionalData: {}
    })
  }
}))

describe('IntegrationManager', () => {
  let integrationManager: IntegrationManager
  let mockProvider: MockProvider

  beforeEach(() => {
    // Get fresh instance for each test
    integrationManager = IntegrationManager.getInstance()
    mockProvider = new MockProvider()
    
    // Clear any existing providers
    const registry = (integrationManager as any).providerRegistry || integrationManager.getAllProviders()
    if (Array.isArray(registry)) {
      // If it's an array, we can't clear it directly, but we can register our mock
    }
    
    // Register mock provider
    integrationManager.registerProvider(mockProvider)
  })

  describe('Provider Registry Management', () => {
    it('should register and retrieve providers', () => {
      const provider = integrationManager.getProvider('mock')
      expect(provider).toBe(mockProvider)
      expect(provider.name).toBe('mock')
      expect(provider.type).toBe('productivity')
    })

    it('should get all providers', () => {
      const providers = integrationManager.getAllProviders()
      expect(providers).toContain(mockProvider)
    })

    it('should get providers by type', () => {
      const productivityProviders = integrationManager.getProvidersByType('productivity')
      expect(productivityProviders).toContain(mockProvider)
      
      const ticketingProviders = integrationManager.getProvidersByType('ticketing')
      expect(ticketingProviders).not.toContain(mockProvider)
    })

    it('should throw error for unknown provider', () => {
      expect(() => integrationManager.getProvider('unknown')).toThrow('Integration provider \'unknown\' not found')
    })
  })

  describe('OAuth Flow Management', () => {
    it('should initiate OAuth flow', async () => {
      const result = await integrationManager.initiateOAuth(
        'org-123',
        'mock',
        'https://app.com/callback'
      )

      expect(result).toHaveProperty('authUrl')
      expect(result).toHaveProperty('state')
      expect(result.authUrl).toContain('mock.com/oauth')
      expect(result.state).toBe('mock-state')
    })

    it('should handle OAuth callback', async () => {
      // Mock the database operations
      const mockIntegration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'mock',
        providerType: 'productivity',
        accessToken: 'encrypted-token',
        refreshToken: 'encrypted-token',
        tokenExpiresAt: new Date(),
        config: '{}',
        isActive: true,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.create).mockResolvedValue(mockIntegration)

      const result = await integrationManager.handleOAuthCallback('mock', {
        organizationId: 'org-123',
        code: 'auth-code',
        state: 'mock-state'
      })

      expect(result).toEqual(mockIntegration)
      expect(prisma.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-123',
          providerName: 'mock',
          providerType: 'productivity',
          accessToken: 'encrypted-token',
          refreshToken: 'encrypted-token',
          isActive: true
        })
      })
    })
  })

  describe('Integration CRUD Operations', () => {
    it('should create integration', async () => {
      const mockIntegration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'mock',
        providerType: 'productivity',
        accessToken: 'encrypted-token',
        refreshToken: 'encrypted-token',
        tokenExpiresAt: new Date(),
        config: '{}',
        isActive: true,
        lastSyncAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.create).mockResolvedValue(mockIntegration)

      const tokenData: TokenData = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        scope: 'read,write'
      }

      const result = await integrationManager.createIntegration({
        organizationId: 'org-123',
        providerName: 'mock',
        tokenData,
        config: { customSetting: 'value' }
      })

      expect(result).toEqual(mockIntegration)
      expect(prisma.integration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-123',
          providerName: 'mock',
          providerType: 'productivity',
          config: expect.objectContaining({
            customSetting: 'value',
            scope: 'read,write'
          })
        })
      })
    })

    it('should get organization integrations', async () => {
      const mockIntegrations = [
        {
          id: 'integration-1',
          organizationId: 'org-123',
          providerName: 'mock',
          providerType: 'productivity',
          isActive: true,
          organization: { id: 'org-123', name: 'Test Org' },
          connections: []
        }
      ]

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.findMany).mockResolvedValue(mockIntegrations as any)

      const result = await integrationManager.getOrganizationIntegrations('org-123')

      expect(result).toEqual(mockIntegrations)
      expect(prisma.integration.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-123',
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
    })
  })

  describe('Channel Operations', () => {
    it('should get available channels', async () => {
      const mockIntegration = {
        id: 'integration-123',
        providerName: 'mock',
        isActive: true
      }

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)

      const channels = await integrationManager.getAvailableChannels('integration-123')

      expect(channels).toHaveLength(2)
      expect(channels[0]).toEqual({ id: 'channel1', name: 'General', type: 'public' })
      expect(channels[1]).toEqual({ id: 'channel2', name: 'Private Channel', type: 'private' })
    })

    it('should throw error for inactive integration', async () => {
      const mockIntegration = {
        id: 'integration-123',
        providerName: 'mock',
        isActive: false
      }

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)

      await expect(integrationManager.getAvailableChannels('integration-123'))
        .rejects.toThrow('Integration not found or inactive')
    })
  })

  describe('Connection Management', () => {
    it('should connect note to channel', async () => {
      const mockIntegration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'mock',
        isActive: true
      }

      const mockNote = {
        id: 'note-123',
        organizationId: 'org-123',
        title: 'Test Note',
        organization: { id: 'org-123', name: 'Test Org' }
      }

      const mockConnection = {
        id: 'connection-123',
        noteId: 'note-123',
        integrationId: 'integration-123',
        externalId: 'channel1',
        config: {
          channelName: 'General',
          channelType: 'public'
        },
        isActive: true
      }

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)
      vi.mocked(prisma.noteIntegrationConnection.create).mockResolvedValue(mockConnection as any)

      const result = await integrationManager.connectNoteToChannel({
        noteId: 'note-123',
        integrationId: 'integration-123',
        externalId: 'channel1'
      })

      expect(result).toEqual(mockConnection)
      expect(prisma.noteIntegrationConnection.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          noteId: 'note-123',
          integrationId: 'integration-123',
          externalId: 'channel1',
          config: expect.objectContaining({
            channelName: 'General',
            channelType: 'public'
          }),
          isActive: true
        })
      })
    })

    it('should validate organization match when connecting', async () => {
      const mockIntegration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'mock',
        isActive: true
      }

      const mockNote = {
        id: 'note-123',
        organizationId: 'org-456', // Different organization
        title: 'Test Note',
        organization: { id: 'org-456', name: 'Other Org' }
      }

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)
      vi.mocked(prisma.organizationNote.findUnique).mockResolvedValue(mockNote as any)

      await expect(integrationManager.connectNoteToChannel({
        noteId: 'note-123',
        integrationId: 'integration-123',
        externalId: 'channel1'
      })).rejects.toThrow('Note and integration must belong to the same organization')
    })
  })

  describe('Validation and Health Checks', () => {
    it('should validate integration connections', async () => {
      const mockConnections = [
        {
          id: 'connection-1',
          integration: { providerName: 'mock' }
        },
        {
          id: 'connection-2',
          integration: { providerName: 'mock' }
        }
      ]

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.noteIntegrationConnection.findMany).mockResolvedValue(mockConnections as any)

      const result = await integrationManager.validateIntegrationConnections('integration-123')

      expect(result.valid).toBe(2)
      expect(result.invalid).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should get integration status', async () => {
      const mockIntegration = {
        id: 'integration-123',
        isActive: true,
        lastSyncAt: new Date(),
        connections: [{ id: 'conn-1' }, { id: 'conn-2' }]
      }

      const mockErrors = [
        {
          action: 'post_message',
          status: 'error',
          errorMessage: 'Channel not found',
          createdAt: new Date()
        }
      ]

      const { prisma } = await import('../db.server')
      vi.mocked(prisma.integration.findUnique).mockResolvedValue(mockIntegration as any)
      vi.mocked(prisma.integrationLog.findMany).mockResolvedValue(mockErrors as any)

      const result = await integrationManager.getIntegrationStatus('integration-123')

      expect(result.status).toBe('active')
      expect(result.connectionCount).toBe(2)
      expect(result.recentErrors).toHaveLength(1)
      expect(result.recentErrors[0]?.action).toBe('post_message')
    })
  })
})