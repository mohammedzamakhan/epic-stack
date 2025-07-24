/**
 * Unit tests for integration service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { IntegrationService, integrationService } from '../../src/service'
import { integrationManager } from '../../src/integration-manager'
import type {
  TokenData,
  Channel,
  MessageData,
  OAuthCallbackParams,
  IntegrationStatus,
  ProviderType,
  IntegrationLogEntry,
  IntegrationProvider,
} from '../../src/types'
import type { Integration, NoteIntegrationConnection, OrganizationNote } from '@prisma/client'

// Mock the integration manager
vi.mock('../../src/integration-manager', () => ({
  integrationManager: {
    initiateOAuth: vi.fn(),
    handleOAuthCallback: vi.fn(),
    getAvailableChannels: vi.fn(),
    connectNoteToChannel: vi.fn(),
    disconnectNoteFromChannel: vi.fn(),
    handleNoteUpdate: vi.fn(),
    refreshIntegrationTokens: vi.fn(),
    validateIntegrationConnections: vi.fn(),
    getIntegrationStatus: vi.fn(),
    disconnectIntegration: vi.fn(),
    getOrganizationIntegrations: vi.fn(),
    getNoteConnections: vi.fn(),
    logIntegrationActivity: vi.fn(),
    registerProvider: vi.fn(),
    getProvider: vi.fn(),
    getAllProviders: vi.fn(),
    getProvidersByType: vi.fn(),
    getIntegration: vi.fn(),
    getIntegrationConnections: vi.fn(),
    getIntegrationStats: vi.fn(),
    updateIntegrationConfig: vi.fn(),
  },
}))

// Mock OAuth manager for token validation
vi.mock('../../src/oauth-manager', () => ({
  TokenRefreshManager: {
    shouldRefreshToken: vi.fn(),
    isTokenExpired: vi.fn(),
  },
}))

describe('IntegrationService', () => {
  let service: IntegrationService

  beforeEach(() => {
    service = new IntegrationService()
    vi.clearAllMocks()
  })

  describe('OAuth Operations', () => {
    describe('initiateOAuth', () => {
      it('should initiate OAuth flow successfully', async () => {
        const organizationId = 'org-123'
        const providerName = 'slack'
        const redirectUri = 'https://app.com/callback'
        const expectedResult = {
          authUrl: 'https://slack.com/oauth/authorize',
          state: 'oauth-state-123',
        }

        vi.mocked(integrationManager.initiateOAuth).mockResolvedValue(expectedResult)

        const result = await service.initiateOAuth(organizationId, providerName, redirectUri)

        expect(result).toEqual(expectedResult)
        expect(integrationManager.initiateOAuth).toHaveBeenCalledWith(
          organizationId,
          providerName,
          redirectUri,
          undefined
        )
      })

      it('should pass additional parameters', async () => {
        const organizationId = 'org-123'
        const providerName = 'slack'
        const redirectUri = 'https://app.com/callback'
        const additionalParams = { scope: 'read write' }
        const expectedResult = {
          authUrl: 'https://slack.com/oauth/authorize',
          state: 'oauth-state-123',
        }

        vi.mocked(integrationManager.initiateOAuth).mockResolvedValue(expectedResult)

        const result = await service.initiateOAuth(
          organizationId,
          providerName,
          redirectUri,
          additionalParams
        )

        expect(result).toEqual(expectedResult)
        expect(integrationManager.initiateOAuth).toHaveBeenCalledWith(
          organizationId,
          providerName,
          redirectUri,
          additionalParams
        )
      })
    })

    describe('handleOAuthCallback', () => {
      it('should handle OAuth callback successfully', async () => {
        const providerName = 'slack'
        const params: OAuthCallbackParams = {
          organizationId: 'org-123',
          code: 'auth-code',
          state: 'oauth-state-123',
        }
        const expectedIntegration = {
          id: 'integration-123',
          organizationId: 'org-123',
          providerName: 'slack',
        } as Integration

        vi.mocked(integrationManager.handleOAuthCallback).mockResolvedValue(expectedIntegration)

        const result = await service.handleOAuthCallback(providerName, params)

        expect(result).toEqual(expectedIntegration)
        expect(integrationManager.handleOAuthCallback).toHaveBeenCalledWith(providerName, params)
      })
    })
  })

  describe('Channel Operations', () => {
    describe('getAvailableChannels', () => {
      it('should get available channels', async () => {
        const integrationId = 'integration-123'
        const expectedChannels: Channel[] = [
          { id: 'channel-1', name: 'General', type: 'public' },
          { id: 'channel-2', name: 'Random', type: 'public' },
        ]

        vi.mocked(integrationManager.getAvailableChannels).mockResolvedValue(expectedChannels)

        const result = await service.getAvailableChannels(integrationId)

        expect(result).toEqual(expectedChannels)
        expect(integrationManager.getAvailableChannels).toHaveBeenCalledWith(integrationId)
      })
    })
  })

  describe('Connection Management', () => {
    describe('connectNoteToChannel', () => {
      it('should connect note to channel successfully', async () => {
        const noteId = 'note-123'
        const integrationId = 'integration-123'
        const channelId = 'channel-123'
        const config = { includeContent: true }
        const expectedConnection = {
          id: 'connection-123',
          noteId,
          integrationId,
          externalId: channelId,
        } as NoteIntegrationConnection

        vi.mocked(integrationManager.connectNoteToChannel).mockResolvedValue(expectedConnection)

        const result = await service.connectNoteToChannel(noteId, integrationId, channelId, config)

        expect(result).toEqual(expectedConnection)
        expect(integrationManager.connectNoteToChannel).toHaveBeenCalledWith({
          noteId,
          integrationId,
          externalId: channelId,
          config,
        })
      })

      it('should connect note to channel without config', async () => {
        const noteId = 'note-123'
        const integrationId = 'integration-123'
        const channelId = 'channel-123'
        const expectedConnection = {
          id: 'connection-123',
          noteId,
          integrationId,
          externalId: channelId,
        } as NoteIntegrationConnection

        vi.mocked(integrationManager.connectNoteToChannel).mockResolvedValue(expectedConnection)

        const result = await service.connectNoteToChannel(noteId, integrationId, channelId)

        expect(result).toEqual(expectedConnection)
        expect(integrationManager.connectNoteToChannel).toHaveBeenCalledWith({
          noteId,
          integrationId,
          externalId: channelId,
          config: undefined,
        })
      })
    })

    describe('disconnectNoteFromChannel', () => {
      it('should disconnect note from channel', async () => {
        const connectionId = 'connection-123'

        vi.mocked(integrationManager.disconnectNoteFromChannel).mockResolvedValue()

        await service.disconnectNoteFromChannel(connectionId)

        expect(integrationManager.disconnectNoteFromChannel).toHaveBeenCalledWith(connectionId)
      })
    })

    describe('getNoteConnections', () => {
      it('should get note connections', async () => {
        const noteId = 'note-123'
        const expectedConnections = [
          { id: 'connection-1', noteId, integrationId: 'integration-1' },
          { id: 'connection-2', noteId, integrationId: 'integration-2' },
        ] as NoteIntegrationConnection[]

        vi.mocked(integrationManager.getNoteConnections).mockResolvedValue(expectedConnections)

        const result = await service.getNoteConnections(noteId)

        expect(result).toEqual(expectedConnections)
        expect(integrationManager.getNoteConnections).toHaveBeenCalledWith(noteId)
      })
    })
  })

  describe('Note Update Handling', () => {
    describe('handleNoteUpdate', () => {
      it('should handle note update', async () => {
        const noteId = 'note-123'
        const changeType = 'updated'
        const userId = 'user-123'

        vi.mocked(integrationManager.handleNoteUpdate).mockResolvedValue()

        await service.handleNoteUpdate(noteId, changeType, userId)

        expect(integrationManager.handleNoteUpdate).toHaveBeenCalledWith(noteId, changeType, userId)
      })
    })
  })

  describe('Token Management', () => {
    describe('refreshTokens', () => {
      it('should refresh integration tokens', async () => {
        const integrationId = 'integration-123'
        const expectedIntegration = {
          id: integrationId,
          accessToken: 'new-access-token',
        } as Integration

        vi.mocked(integrationManager.refreshIntegrationTokens).mockResolvedValue(expectedIntegration)

        const result = await service.refreshTokens(integrationId)

        expect(result).toEqual(expectedIntegration)
        expect(integrationManager.refreshIntegrationTokens).toHaveBeenCalledWith(integrationId)
      })
    })

    describe('shouldRefreshToken', () => {
      it('should check if token needs refresh', async () => {
        const tokenData: TokenData = {
          accessToken: 'access-token',
          expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
        }

        const { TokenRefreshManager } = await import('../../src/oauth-manager')
        vi.mocked(TokenRefreshManager.shouldRefreshToken).mockReturnValue(true)

        const result = service.shouldRefreshToken(tokenData)

        expect(result).toBe(true)
        expect(TokenRefreshManager.shouldRefreshToken).toHaveBeenCalledWith(tokenData)
      })
    })

    describe('isTokenExpired', () => {
      it('should check if token is expired', async () => {
        const tokenData: TokenData = {
          accessToken: 'access-token',
          expiresAt: new Date(Date.now() - 1000), // 1 second ago
        }

        const { TokenRefreshManager } = await import('../../src/oauth-manager')
        vi.mocked(TokenRefreshManager.isTokenExpired).mockReturnValue(true)

        const result = service.isTokenExpired(tokenData)

        expect(result).toBe(true)
        expect(TokenRefreshManager.isTokenExpired).toHaveBeenCalledWith(tokenData)
      })
    })
  })

  describe('Integration Management', () => {
    describe('validateIntegrationConnections', () => {
      it('should validate integration connections', async () => {
        const integrationId = 'integration-123'
        const expectedResult = {
          valid: 2,
          invalid: 1,
          errors: ['Connection connection-3 is invalid'],
        }

        vi.mocked(integrationManager.validateIntegrationConnections).mockResolvedValue(expectedResult)

        const result = await service.validateIntegrationConnections(integrationId)

        expect(result).toEqual(expectedResult)
        expect(integrationManager.validateIntegrationConnections).toHaveBeenCalledWith(integrationId)
      })
    })

    describe('getIntegrationStatus', () => {
      it('should get integration status', async () => {
        const integrationId = 'integration-123'
        const expectedStatus = {
          status: 'active' as IntegrationStatus,
          lastSync: new Date(),
          connectionCount: 3,
          recentErrors: [] as IntegrationLogEntry[],
        }

        vi.mocked(integrationManager.getIntegrationStatus).mockResolvedValue(expectedStatus)

        const result = await service.getIntegrationStatus(integrationId)

        expect(result).toEqual(expectedStatus)
        expect(integrationManager.getIntegrationStatus).toHaveBeenCalledWith(integrationId)
      })
    })

    describe('disconnectIntegration', () => {
      it('should disconnect integration', async () => {
        const integrationId = 'integration-123'

        vi.mocked(integrationManager.disconnectIntegration).mockResolvedValue()

        await service.disconnectIntegration(integrationId)

        expect(integrationManager.disconnectIntegration).toHaveBeenCalledWith(integrationId)
      })
    })

    describe('getOrganizationIntegrations', () => {
      it('should get organization integrations without type filter', async () => {
        const organizationId = 'org-123'
        const expectedIntegrations = [
          { id: 'integration-1', organizationId, providerName: 'slack' },
          { id: 'integration-2', organizationId, providerName: 'jira' },
        ] as Integration[]

        vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(expectedIntegrations)

        const result = await service.getOrganizationIntegrations(organizationId)

        expect(result).toEqual(expectedIntegrations)
        expect(integrationManager.getOrganizationIntegrations).toHaveBeenCalledWith(organizationId, undefined)
      })

      it('should get organization integrations with type filter', async () => {
        const organizationId = 'org-123'
        const type: ProviderType = 'communication'
        const expectedIntegrations = [
          { id: 'integration-1', organizationId, providerName: 'slack' },
        ] as Integration[]

        vi.mocked(integrationManager.getOrganizationIntegrations).mockResolvedValue(expectedIntegrations)

        const result = await service.getOrganizationIntegrations(organizationId, type)

        expect(result).toEqual(expectedIntegrations)
        expect(integrationManager.getOrganizationIntegrations).toHaveBeenCalledWith(organizationId, type)
      })
    })
  })

  describe('Logging', () => {
    describe('logIntegrationActivity', () => {
      it('should log integration activity', async () => {
        const integrationId = 'integration-123'
        const action = 'test_action'
        const status = 'success'
        const data = { test: 'data' }
        const error = 'test error'

        vi.mocked(integrationManager.logIntegrationActivity).mockResolvedValue()

        await service.logIntegrationActivity(integrationId, action, status, data, error)

        expect(integrationManager.logIntegrationActivity).toHaveBeenCalledWith(
          integrationId,
          action,
          status,
          data,
          error
        )
      })
    })
  })

  describe('Message Formatting', () => {
    describe('formatNoteMessage', () => {
      it('should format note message for creation', () => {
        const note: OrganizationNote = {
          id: 'note-123',
          title: 'Test Note',
          content: 'This is a test note content',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-123',
        }
        const changeType = 'created'
        const author = { name: 'John Doe' }

        const result = service.formatNoteMessage(note, changeType, author)

        expect(result).toEqual({
          title: 'Test Note',
          content: 'This is a test note content',
          author: 'John Doe',
          noteUrl: '/notes/note-123',
          changeType: 'created',
        })
      })

      it('should truncate long content', () => {
        const longContent = 'a'.repeat(600) // 600 characters
        const note: OrganizationNote = {
          id: 'note-123',
          title: 'Test Note',
          content: longContent,
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-123',
        }
        const changeType = 'updated'
        const author = { name: 'John Doe' }

        const result = service.formatNoteMessage(note, changeType, author)

        expect(result.content).toHaveLength(500)
        expect(result.content.endsWith('...')).toBe(true)
      })

      it('should handle empty content', () => {
        const note: OrganizationNote = {
          id: 'note-123',
          title: 'Test Note',
          content: '',
          organizationId: 'org-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-123',
        }
        const changeType = 'deleted'
        const author = { name: 'John Doe' }

        const result = service.formatNoteMessage(note, changeType, author)

        expect(result.content).toBe('')
      })
    })
  })

  describe('Provider Management', () => {
    describe('registerProvider', () => {
      it('should register a provider', () => {
        const mockProvider = {
          name: 'test-provider',
          type: 'communication',
        } as IntegrationProvider

        service.registerProvider(mockProvider)

        expect(integrationManager.registerProvider).toHaveBeenCalledWith(mockProvider)
      })
    })

    describe('getProvider', () => {
      it('should get a provider by name', () => {
        const providerName = 'slack'
        const mockProvider = {
          name: 'slack',
          type: 'communication',
        } as IntegrationProvider

        vi.mocked(integrationManager.getProvider).mockReturnValue(mockProvider)

        const result = service.getProvider(providerName)

        expect(result).toEqual(mockProvider)
        expect(integrationManager.getProvider).toHaveBeenCalledWith(providerName)
      })
    })

    describe('getAllProviders', () => {
      it('should get all providers', () => {
        const mockProviders = [
          { name: 'slack', type: 'communication' },
          { name: 'jira', type: 'ticketing' },
        ] as IntegrationProvider[]

        vi.mocked(integrationManager.getAllProviders).mockReturnValue(mockProviders)

        const result = service.getAllProviders()

        expect(result).toEqual(mockProviders)
        expect(integrationManager.getAllProviders).toHaveBeenCalled()
      })
    })

    describe('getProvidersByType', () => {
      it('should get providers by type', () => {
        const type: ProviderType = 'communication'
        const mockProviders = [
          { name: 'slack', type: 'communication' },
        ] as IntegrationProvider[]

        vi.mocked(integrationManager.getProvidersByType).mockReturnValue(mockProviders)

        const result = service.getProvidersByType(type)

        expect(result).toEqual(mockProviders)
        expect(integrationManager.getProvidersByType).toHaveBeenCalledWith(type)
      })
    })
  })

  describe('Additional Integration Methods', () => {
    describe('getIntegration', () => {
      it('should get integration by ID', async () => {
        const integrationId = 'integration-123'
        const mockIntegration = {
          id: integrationId,
          organizationId: 'org-123',
        }

        vi.mocked(integrationManager.getIntegration).mockResolvedValue(mockIntegration)

        const result = await service.getIntegration(integrationId)

        expect(result).toEqual(mockIntegration)
        expect(integrationManager.getIntegration).toHaveBeenCalledWith(integrationId)
      })
    })

    describe('getIntegrationConnections', () => {
      it('should get integration connections', async () => {
        const integrationId = 'integration-123'
        const mockConnections = [
          { id: 'connection-1', integrationId },
          { id: 'connection-2', integrationId },
        ]

        vi.mocked(integrationManager.getIntegrationConnections).mockResolvedValue(mockConnections)

        const result = await service.getIntegrationConnections(integrationId)

        expect(result).toEqual(mockConnections)
        expect(integrationManager.getIntegrationConnections).toHaveBeenCalledWith(integrationId)
      })
    })

    describe('getIntegrationStats', () => {
      it('should get integration statistics', async () => {
        const integrationId = 'integration-123'
        const mockStats = {
          totalConnections: 5,
          activeConnections: 4,
          recentActivity: 10,
          errorCount: 1,
        }

        vi.mocked(integrationManager.getIntegrationStats).mockResolvedValue(mockStats)

        const result = await service.getIntegrationStats(integrationId)

        expect(result).toEqual(mockStats)
        expect(integrationManager.getIntegrationStats).toHaveBeenCalledWith(integrationId)
      })
    })

    describe('updateIntegrationConfig', () => {
      it('should update integration configuration', async () => {
        const integrationId = 'integration-123'
        const config = { setting1: 'value1', setting2: 'value2' }
        const mockIntegration = {
          id: integrationId,
          config: JSON.stringify(config),
        }

        vi.mocked(integrationManager.updateIntegrationConfig).mockResolvedValue(mockIntegration)

        const result = await service.updateIntegrationConfig(integrationId, config)

        expect(result).toEqual(mockIntegration)
        expect(integrationManager.updateIntegrationConfig).toHaveBeenCalledWith(integrationId, config)
      })
    })
  })
})

describe('Singleton instance', () => {
  it('should export a singleton instance', () => {
    expect(integrationService).toBeInstanceOf(IntegrationService)
  })

  it('should be the same instance across imports', async () => {
    const { integrationService: importedService } = await import('../../src/service')
    expect(integrationService).toBe(importedService)
  })
})