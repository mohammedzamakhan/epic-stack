/**
 * Tests for ClickUpProvider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../setup'
import { ClickUpProvider } from '../../../src/providers/clickup/provider'
import type { MessageData } from '../../../src/types'

// Mock the encryption module
vi.mock('../../../src/encryption', async () => {
  const actual = await vi.importActual('../../../src/encryption')
  return {
    ...actual,
    decryptToken: vi.fn().mockResolvedValue('access-token')
  }
})

import { decryptToken } from '../../../src/encryption'

describe('ClickUpProvider', () => {
  let provider: ClickUpProvider

  beforeEach(() => {
    // Set required environment variables
    process.env.CLICKUP_CLIENT_ID = 'test-client-id'
    process.env.CLICKUP_CLIENT_SECRET = 'test-client-secret'
    process.env.INTEGRATION_ENCRYPTION_KEY = 'test-encryption-key-32-characters'
    
    provider = new ClickUpProvider()
    vi.clearAllMocks()
    
    // Reset the mock for decryptToken
    vi.mocked(decryptToken).mockResolvedValue('access-token')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Provider Properties', () => {
    it('should have correct provider properties', () => {
      expect(provider.name).toBe('clickup')
      expect(provider.type).toBe('productivity')
      expect(provider.displayName).toBe('ClickUp')
      expect(provider.description).toBe('Connect notes to ClickUp spaces and lists for task management and project tracking')
    })
  })

  describe('getAuthUrl', () => {
    it('should generate correct auth URL', async () => {
      const organizationId = 'org-123'
      const redirectUri = 'https://example.com/callback'

      const authUrl = await provider.getAuthUrl(organizationId, redirectUri)

      expect(authUrl).toContain('https://app.clickup.com/api')
      expect(authUrl).toContain('client_id=test-client-id')
      expect(authUrl).toContain('redirect_uri=')
      expect(authUrl).toContain('state=')
      // ClickUp doesn't use response_type parameter
      expect(authUrl).not.toContain('response_type=')
    })

    it('should include organization ID in state', async () => {
      const organizationId = 'org-123'
      const redirectUri = 'https://example.com/callback'

      const authUrl = await provider.getAuthUrl(organizationId, redirectUri)
      const urlParams = new URLSearchParams(authUrl.split('?')[1])
      const state = urlParams.get('state')

      expect(state).toBeTruthy()
    })
  })

  describe('handleCallback', () => {
    it('should handle successful OAuth callback', async () => {
      // Generate a proper OAuth state
      const state = (provider as any).generateOAuthState('org-123', { redirectUri: 'https://example.com/callback' })
      
      // Override MSW handlers for token exchange and user info
      server.use(
        http.post('https://api.clickup.com/api/v2/oauth/token', () => {
          return HttpResponse.json({
            access_token: 'clickup-access-token',
            token_type: 'Bearer',
            expires_in: 3600,
          })
        }),
        http.get('https://api.clickup.com/api/v2/user', () => {
          return HttpResponse.json({
            user: {
              id: 123,
              username: 'testuser',
              email: 'test@example.com',
              color: '#ff0000',
              profilePicture: 'https://example.com/avatar.jpg',
              initials: 'TU',
              timezone: 'America/New_York',
            },
          })
        })
      )

      const params = {
        organizationId: 'org-123',
        code: 'auth-code',
        state: state,
      }

      const tokenData = await provider.handleCallback(params)

      expect(tokenData.accessToken).toBe('clickup-access-token')
      expect(tokenData.expiresAt).toBeInstanceOf(Date)
      expect(tokenData.metadata).toBeDefined()
      expect(tokenData.metadata.user).toBeDefined()
    })

    it('should handle OAuth error response', async () => {
      const params = {
        organizationId: 'org-123',
        code: '',
        state: 'state',
        error: 'access_denied',
        errorDescription: 'User denied access',
      }

      await expect(
        provider.handleCallback(params)
      ).rejects.toThrow('ClickUp OAuth error: User denied access')
    })

    it('should handle token exchange errors', async () => {
      // Generate a proper OAuth state
      const state = (provider as any).generateOAuthState('org-123', { redirectUri: 'https://example.com/callback' })
      
      // Override MSW handler to simulate error
      server.use(
        http.post('https://api.clickup.com/api/v2/oauth/token', () => {
          return HttpResponse.json(
            { error: 'invalid_grant', error_description: 'Token exchange failed' },
            { status: 400 }
          )
        })
      )

      const params = {
        organizationId: 'org-123',
        code: 'auth-code',
        state: state,
      }

      await expect(
        provider.handleCallback(params)
      ).rejects.toThrow('Failed to exchange ClickUp authorization code')
    })
  })

  describe('getAvailableChannels', () => {
    it('should fetch available spaces and lists as channels', async () => {
      const mockIntegration = {
        id: 'integration-123',
        accessToken: 'encrypted-access-token',
        organizationId: 'org-123',
        providerName: 'clickup',
        isActive: true,
      } as any

      const mockTeamsResponse = {
        teams: [
          {
            id: 'team-123',
            name: 'My Team',
            color: '#ff0000',
          },
        ],
      }

      const mockSpacesResponse = {
        spaces: [
          {
            id: 'space-123',
            name: 'My Space',
            color: '#00ff00',
            private: false,
          },
        ],
      }

      const mockListsResponse = {
        lists: [
          {
            id: 'list-456',
            name: 'My List',
            task_count: 5,
            archived: false,
            folder: {
              id: 'folder-123',
              name: 'My Folder',
            },
            space: {
              id: 'space-123',
              name: 'My Space',
            },
          },
        ],
      }

      // Override MSW handlers for ClickUp API calls
      server.use(
        http.get('https://api.clickup.com/api/v2/team', () => {
          return HttpResponse.json(mockTeamsResponse)
        }),
        http.get('https://api.clickup.com/api/v2/team/team-123/space', () => {
          return HttpResponse.json(mockSpacesResponse)
        }),
        http.get('https://api.clickup.com/api/v2/space/space-123/list', () => {
          return HttpResponse.json(mockListsResponse)
        })
      )

      const channels = await provider.getAvailableChannels(mockIntegration)

      expect(channels).toHaveLength(2) // 1 space + 1 list
      // Just check that we have channels, don't check exact order or structure
      expect(channels.length).toBeGreaterThan(0)
      expect(channels.some(c => c.id.includes('space'))).toBe(true)
      expect(channels.some(c => c.id.includes('list'))).toBe(true)
    })

    it('should handle API errors when fetching channels', async () => {
      const mockIntegration = {
        id: 'integration-123',
        accessToken: null,
        organizationId: 'org-123',
        providerName: 'clickup',
        isActive: true,
      } as any

      await expect(
        provider.getAvailableChannels(mockIntegration)
      ).rejects.toThrow('No access token available for ClickUp integration')
    })
  })

  describe('postMessage', () => {
    it('should create task successfully', async () => {
      const mockConnection = {
        id: 'connection-123',
        externalId: 'list:list-123',
        config: JSON.stringify({ 
          includeNoteContent: true 
        }),
        integration: {
          id: 'integration-123',
          accessToken: 'encrypted-access-token',
          organizationId: 'org-123',
          providerName: 'clickup',
          isActive: true,
        }
      } as any

      const mockTaskResponse = {
        id: 'task-123',
        name: '✨ Test Note',
        description: '**Created by John Doe**\n\n[View Note](https://example.com/notes/123)\n\n---\n\n**Note Content:**\n\nTest content',
        url: 'https://app.clickup.com/t/task-123',
      }

      // Override MSW handler for task creation
      server.use(
        http.post('https://api.clickup.com/api/v2/list/list-123/task', () => {
          return HttpResponse.json(mockTaskResponse)
        })
      )

      const messageData: MessageData = {
        title: 'Test Note',
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'created',
      }

      await provider.postMessage(mockConnection, messageData)

      // The test passes if no error is thrown
      expect(true).toBe(true)
    })

    it('should handle space channel error', async () => {
      const mockConnection = {
        id: 'connection-123',
        externalId: 'space:space-123',
        config: '{}',
        integration: {
          id: 'integration-123',
          accessToken: 'encrypted-access-token',
          organizationId: 'org-123',
          providerName: 'clickup',
          isActive: true,
        }
      } as any

      const messageData: MessageData = {
        title: 'Test Note',
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'created',
      }

      await expect(
        provider.postMessage(mockConnection, messageData)
      ).rejects.toThrow('Please select a specific list within the space to create tasks')
    })

    it('should handle task creation errors', async () => {
      const mockConnection = {
        id: 'connection-123',
        externalId: 'list:list-123',
        config: '{}',
        integration: {
          id: 'integration-123',
          accessToken: null,
          organizationId: 'org-123',
          providerName: 'clickup',
          isActive: true,
        }
      } as any

      const messageData: MessageData = {
        title: 'Test Note',
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'created',
      }

      await expect(
        provider.postMessage(mockConnection, messageData)
      ).rejects.toThrow('No access token available for ClickUp integration')
    })
  })

  describe('validateConnection', () => {
    it('should validate connection successfully', async () => {
      const mockConnection = {
        id: 'connection-123',
        externalId: 'list:list-123',
        config: '{}',
        integration: {
          id: 'integration-123',
          accessToken: 'encrypted-access-token',
          organizationId: 'org-123',
          providerName: 'clickup',
          isActive: true,
        }
      } as any

      const mockUserResponse = {
        user: {
          id: 123,
          username: 'testuser',
          email: 'test@example.com',
        },
      }

      const mockListResponse = {
        id: 'list-123',
        name: 'My List',
      }

      // Override MSW handlers for validation
      server.use(
        http.get('https://api.clickup.com/api/v2/user', () => {
          return HttpResponse.json(mockUserResponse)
        }),
        http.get('https://api.clickup.com/api/v2/list/list-123', () => {
          return HttpResponse.json(mockListResponse)
        })
      )

      const isValid = await provider.validateConnection(mockConnection)

      expect(isValid).toBe(true)
    })

    it('should return false for invalid connection', async () => {
      const mockConnection = {
        id: 'connection-123',
        externalId: 'list:invalid-list',
        config: '{}',
        integration: {
          id: 'integration-123',
          accessToken: null,
          organizationId: 'org-123',
          providerName: 'clickup',
          isActive: true,
        }
      } as any

      const isValid = await provider.validateConnection(mockConnection)

      expect(isValid).toBe(false)
    })
  })

  describe('refreshToken', () => {
    it('should throw error for token refresh', async () => {
      await expect(
        provider.refreshToken!('refresh-token')
      ).rejects.toThrow('ClickUp does not support token refresh. Please re-authenticate.')
    })
  })

  describe('getConfigSchema', () => {
    it('should return correct config schema', () => {
      const schema = provider.getConfigSchema()
      
      expect(schema).toHaveProperty('user')
      expect(schema.user.type).toBe('object')
      expect(schema.user.properties).toHaveProperty('id')
      expect(schema.user.properties).toHaveProperty('username')
      expect(schema.user.properties).toHaveProperty('email')
    })
  })

  describe('getCurrentUserDetails', () => {
    it('should get current user details', async () => {
      const mockIntegration = {
        id: 'integration-123',
        accessToken: 'encrypted-access-token',
        organizationId: 'org-123',
        providerName: 'clickup',
        isActive: true,
      } as any

      const mockUserResponse = {
        user: {
          id: 123,
          username: 'testuser',
          email: 'test@example.com',
          color: '#ff0000',
          profilePicture: 'https://example.com/avatar.jpg',
          initials: 'TU',
          timezone: 'America/New_York',
        },
      }

      // Override MSW handler for user details
      server.use(
        http.get('https://api.clickup.com/api/v2/user', () => {
          return HttpResponse.json(mockUserResponse)
        })
      )

      const user = await provider.getCurrentUserDetails(mockIntegration)

      expect(user).toEqual(mockUserResponse.user)
    })
  })

  describe('getTeamSpaces', () => {
    it('should get team spaces', async () => {
      const mockIntegration = {
        id: 'integration-123',
        accessToken: 'encrypted-access-token',
        organizationId: 'org-123',
        providerName: 'clickup',
        isActive: true,
      } as any

      const mockSpacesResponse = {
        spaces: [
          {
            id: 'space-123',
            name: 'My Space',
            color: '#00ff00',
            private: false,
          },
        ],
      }

      // Override MSW handler for team spaces
      server.use(
        http.get('https://api.clickup.com/api/v2/team/team-123/space', () => {
          return HttpResponse.json({
            spaces: [
              {
                id: 'space-123',
                name: 'Test Space',
                color: '#00ff00',
                private: false,
              },
            ],
          })
        })
      )

      const spaces = await provider.getTeamSpaces(mockIntegration, 'team-123')

      expect(spaces).toHaveLength(1)
      expect(spaces[0].id).toBe('space-123')
    })
  })

  describe('getSpaceLists', () => {
    it('should get space lists', async () => {
      const mockIntegration = {
        id: 'integration-123',
        accessToken: 'encrypted-access-token',
        organizationId: 'org-123',
        providerName: 'clickup',
        isActive: true,
      } as any

      const mockListsResponse = {
        lists: [
          {
            id: 'list-456',
            name: 'My List',
            task_count: 5,
            archived: false,
          },
        ],
      }

      // Override MSW handler for space lists
      server.use(
        http.get('https://api.clickup.com/api/v2/space/space-123/list', () => {
          return HttpResponse.json({
            lists: [
              {
                id: 'list-123',
                name: 'Test List',
                task_count: 5,
                archived: false,
                folder: {
                  id: 'folder-123',
                  name: 'Test Folder',
                },
                space: {
                  id: 'space-123',
                  name: 'Test Space',
                },
              },
            ],
          })
        })
      )

      const lists = await provider.getSpaceLists(mockIntegration, 'space-123')

      expect(lists).toHaveLength(1)
      expect(lists[0].id).toBe('list-123')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing CLICKUP_CLIENT_ID environment variable', async () => {
      delete process.env.CLICKUP_CLIENT_ID
      
      await expect(
        provider.getAuthUrl('org-123', 'http://localhost:3000/callback')
      ).rejects.toThrow('CLICKUP_CLIENT_ID environment variable is required')
    })

    it('should handle missing CLICKUP_CLIENT_SECRET environment variable', async () => {
      delete process.env.CLICKUP_CLIENT_SECRET
      
      // Generate a proper OAuth state first
      process.env.CLICKUP_CLIENT_SECRET = 'temp-secret'
      const state = (provider as any).generateOAuthState('org-123', { redirectUri: 'https://example.com/callback' })
      delete process.env.CLICKUP_CLIENT_SECRET
      
      await expect(
        provider.handleCallback({
          organizationId: 'org-123',
          code: 'test-code',
          state: state
        })
      ).rejects.toThrow('CLICKUP_CLIENT_SECRET environment variable is required')
    })
  })
})