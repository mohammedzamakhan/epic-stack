/**
 * Comprehensive integration tests for Slack provider
 * Tests OAuth flow, channel operations, and message posting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlackProvider } from './slack'
import type { OAuthCallbackParams, MessageData } from '../types'
import type { Integration, NoteIntegrationConnection } from '@prisma/client'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    SLACK_CLIENT_ID: 'test_client_id',
    SLACK_CLIENT_SECRET: 'test_client_secret',
    INTEGRATION_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
}))

// Mock OAuth state utilities
vi.mock('../oauth-manager', () => ({
  OAuthStateManager: {
    generateState: vi.fn(() => 'test_state'),
    validateState: vi.fn(() => ({
      organizationId: 'test_org',
      providerName: 'slack',
      timestamp: Date.now(),
    })),
  },
}))

// Mock encryption utilities
vi.mock('../encryption', () => ({
  decryptToken: vi.fn(async (token: string) => 'decrypted_' + token),
  encryptToken: vi.fn(async (token: string) => 'encrypted_' + token),
}))

// Mock fetch
global.fetch = vi.fn()

describe('SlackProvider Integration Tests', () => {
  let provider: SlackProvider
  let mockIntegration: Integration
  let mockConnection: NoteIntegrationConnection & { integration: Integration }
  
  beforeEach(() => {
    provider = new SlackProvider()
    
    mockIntegration = {
      id: 'integration_123',
      organizationId: 'org_123',
      providerName: 'slack',
      providerType: 'productivity',
      accessToken: 'encrypted_token',
      refreshToken: null,
      tokenExpiresAt: null,
      config: JSON.stringify({
        teamId: 'T123456',
        teamName: 'Test Team',
        botUserId: 'U123456',
        scope: 'channels:read,chat:write',
      }),
      isActive: true,
      lastSyncAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockConnection = {
      id: 'connection_123',
      noteId: 'note_123',
      integrationId: 'integration_123',
      externalId: 'C1234567890',
      config: JSON.stringify({
        channelName: 'general',
        channelType: 'public',
        postFormat: 'blocks',
        includeContent: true,
      }),
      isActive: true,
      lastPostedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      integration: mockIntegration,
    }
    
    vi.clearAllMocks()
  })

  describe('Complete OAuth Flow', () => {
    it('should complete full OAuth flow successfully', async () => {
      // Step 1: Generate auth URL
      const authUrl = await provider.getAuthUrl('test_org', 'https://example.com/callback')
      
      expect(authUrl).toContain('https://slack.com/oauth/v2/authorize')
      expect(authUrl).toContain('client_id=test_client_id')
      expect(authUrl).toContain('scope=channels%3Aread%2Cchat%3Awrite%2Cchannels%3Ahistory%2Cgroups%3Aread')

      // Step 2: Handle callback with successful token exchange
      const mockTokenResponse = {
        ok: true,
        access_token: 'xoxb-test-token',
        scope: 'channels:read,chat:write',
        team: { id: 'T123456', name: 'Test Team' },
        bot_user_id: 'U123456',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      })

      const params: OAuthCallbackParams = {
        organizationId: 'test_org',
        code: 'test_code',
        state: 'test_state',
      }

      const tokenData = await provider.handleCallback(params)

      expect(tokenData.accessToken).toBe('xoxb-test-token')
      expect(tokenData.metadata).toEqual({
        teamId: 'T123456',
        teamName: 'Test Team',
        botUserId: 'U123456',
        scope: 'channels:read,chat:write',
      })
    })
  })

  describe('Channel Operations', () => {
    it('should fetch and format channels correctly', async () => {
      const mockChannelsResponse = {
        ok: true,
        channels: [
          {
            id: 'C1234567890',
            name: 'general',
            is_member: true,
            is_archived: false,
            num_members: 25,
            purpose: { value: 'General discussion' },
            topic: { value: 'Welcome!' },
          },
          {
            id: 'C0987654321',
            name: 'random',
            is_member: false,
            is_archived: false,
            num_members: 15,
            purpose: { value: 'Random stuff' },
            topic: { value: '' },
          },
        ],
      }

      // Mock both public and private channel requests
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockChannelsResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ok: true, channels: [] }),
        })

      const channels = await provider.getAvailableChannels(mockIntegration)

      expect(channels).toHaveLength(2)
      expect(channels[0]).toEqual({
        id: 'C1234567890',
        name: 'general',
        type: 'public',
        metadata: {
          is_member: true,
          is_archived: false,
          num_members: 25,
          purpose: 'General discussion',
          topic: 'Welcome!',
        },
      })

      // Verify API calls were made correctly
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('conversations.list?types=public_channel'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer decrypted_encrypted_token',
          }),
        })
      )
    })

    it('should validate connections correctly', async () => {
      const mockChannelInfo = {
        ok: true,
        channel: {
          id: 'C1234567890',
          name: 'general',
          is_archived: false,
          is_private: false,
          is_member: true,
        },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockChannelInfo),
      })

      const isValid = await provider.validateConnection(mockConnection)

      expect(isValid).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('conversations.info?channel=C1234567890'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer decrypted_encrypted_token',
          }),
        })
      )
    })

    it('should handle invalid connections', async () => {
      const mockErrorResponse = {
        ok: false,
        error: 'channel_not_found',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse),
      })

      const isValid = await provider.validateConnection(mockConnection)

      expect(isValid).toBe(false)
    })
  })

  describe('Message Posting', () => {
    it('should post rich block messages successfully', async () => {
      const mockPostResponse = {
        ok: true,
        ts: '1234567890.123456',
        channel: 'C1234567890',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPostResponse),
      })

      const message: MessageData = {
        title: 'Test Note',
        content: 'This is test content with <special> characters & formatting',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'updated',
      }

      await provider.postMessage(mockConnection, message)

      expect(global.fetch).toHaveBeenCalledWith(
        'https://slack.com/api/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer decrypted_encrypted_token',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"blocks"'),
        })
      )

      // Verify the message payload structure
      const callArgs = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)
      
      expect(payload.channel).toBe('C1234567890')
      expect(payload.text).toContain('Test Note')
      expect(payload.blocks).toBeDefined()
      expect(payload.blocks).toHaveLength(4) // section, section, actions, divider
    })

    it('should post plain text messages when configured', async () => {
      // Update connection config for plain text
      mockConnection.config = JSON.stringify({
        channelName: 'general',
        channelType: 'public',
        postFormat: 'text',
        includeContent: true,
      })

      const mockPostResponse = {
        ok: true,
        ts: '1234567890.123456',
        channel: 'C1234567890',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPostResponse),
      })

      const message: MessageData = {
        title: 'Test Note',
        content: 'This is test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'created',
      }

      await provider.postMessage(mockConnection, message)

      const callArgs = (global.fetch as any).mock.calls[0]
      const payload = JSON.parse(callArgs[1].body)
      
      expect(payload.blocks).toBeUndefined()
      expect(payload.text).toContain('Test Note')
      expect(payload.text).toContain('This is test content')
      expect(payload.text).toContain('https://example.com/notes/123')
    })

    it('should handle message posting errors with retry', async () => {
      // First call fails with rate limit, second succeeds
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ok: false, error: 'rate_limited' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ok: true, ts: '1234567890.123456' }),
        })

      const message: MessageData = {
        title: 'Test Note',
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'updated',
      }

      // Mock setTimeout for retry delay
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn()
        return {} as any
      })

      await provider.postMessage(mockConnection, message)

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should not retry non-retryable errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: false, error: 'channel_not_found' }),
      })

      const message: MessageData = {
        title: 'Test Note',
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'updated',
      }

      await expect(provider.postMessage(mockConnection, message)).rejects.toThrow(
        'Slack channel not found'
      )

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should validate message data before posting', async () => {
      const invalidMessage: MessageData = {
        title: '', // Invalid: empty title
        content: 'Test content',
        author: 'John Doe',
        noteUrl: 'https://example.com/notes/123',
        changeType: 'updated',
      }

      await expect(provider.postMessage(mockConnection, invalidMessage)).rejects.toThrow(
        'Message title is required'
      )

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('Provider Configuration', () => {
    it('should have correct provider metadata', () => {
      expect(provider.name).toBe('slack')
      expect(provider.type).toBe('productivity')
      expect(provider.displayName).toBe('Slack')
      expect(provider.description).toContain('Connect notes to Slack channels')
      expect(provider.logoPath).toContain('slack')
    })

    it('should return correct configuration schema', () => {
      const schema = provider.getConfigSchema()
      
      expect(schema.type).toBe('object')
      expect(schema.required).toEqual(['teamId', 'teamName', 'botUserId'])
      expect(schema.properties).toHaveProperty('teamId')
      expect(schema.properties).toHaveProperty('teamName')
      expect(schema.properties).toHaveProperty('botUserId')
      expect(schema.properties).toHaveProperty('scope')
    })
  })

  describe('Error Handling', () => {
    it('should throw appropriate errors for missing environment variables', async () => {
      // Temporarily remove environment variables
      const originalClientId = process.env.SLACK_CLIENT_ID
      delete process.env.SLACK_CLIENT_ID

      await expect(
        provider.getAuthUrl('test_org', 'https://example.com/callback')
      ).rejects.toThrow('SLACK_CLIENT_ID environment variable is not set')

      // Restore environment variable
      process.env.SLACK_CLIENT_ID = originalClientId
    })

    it('should handle OAuth errors gracefully', async () => {
      const params: OAuthCallbackParams = {
        organizationId: 'test_org',
        code: 'test_code',
        state: 'test_state',
        error: 'access_denied',
        errorDescription: 'User denied access',
      }

      await expect(provider.handleCallback(params)).rejects.toThrow(
        'Slack OAuth error: access_denied - User denied access'
      )
    })

    it('should handle API errors with proper error messages', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('{"error":"invalid_auth"}'),
      })

      await expect(provider.getAvailableChannels(mockIntegration)).rejects.toThrow(
        'Slack API conversations.list: 401 Unauthorized - {"error":"invalid_auth"}'
      )
    })
  })
})