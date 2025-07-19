/**
 * Tests for Slack integration provider OAuth functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlackProvider } from './slack'
import type { OAuthCallbackParams } from '../types'

// Mock environment variables
vi.mock('process', () => ({
  env: {
    SLACK_CLIENT_ID: 'test_client_id',
    SLACK_CLIENT_SECRET: 'test_client_secret',
  },
}))

// Mock the OAuth state utilities
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

// Mock fetch for API calls
global.fetch = vi.fn()

describe('SlackProvider OAuth Integration', () => {
  let provider: SlackProvider
  
  beforeEach(() => {
    provider = new SlackProvider()
    vi.clearAllMocks()
  })

  describe('getAuthUrl', () => {
    it('should generate correct Slack OAuth URL', async () => {
      const organizationId = 'test_org_123'
      const redirectUri = 'https://example.com/callback'
      
      const authUrl = await provider.getAuthUrl(organizationId, redirectUri)
      
      expect(authUrl).toContain('https://slack.com/oauth/v2/authorize')
      expect(authUrl).toContain('client_id=test_client_id')
      expect(authUrl).toContain('scope=channels%3Aread%2Cchat%3Awrite%2Cchannels%3Ahistory%2Cgroups%3Aread')
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(redirectUri)}`)
      expect(authUrl).toContain('state=test_state')
      expect(authUrl).toContain('user_scope=')
    })

    it('should throw error if SLACK_CLIENT_ID is not set', async () => {
      // Temporarily remove the client ID
      const originalEnv = process.env.SLACK_CLIENT_ID
      delete process.env.SLACK_CLIENT_ID
      
      await expect(
        provider.getAuthUrl('test_org', 'https://example.com/callback')
      ).rejects.toThrow('SLACK_CLIENT_ID environment variable is not set')
      
      // Restore the environment variable
      process.env.SLACK_CLIENT_ID = originalEnv
    })
  })

  describe('handleCallback', () => {
    it('should successfully exchange code for token', async () => {
      const mockTokenResponse = {
        ok: true,
        access_token: 'xoxb-test-token',
        scope: 'channels:read,chat:write',
        team: {
          id: 'T123456',
          name: 'Test Team',
        },
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

      const result = await provider.handleCallback(params)

      expect(result.accessToken).toBe('xoxb-test-token')
      expect(result.scope).toBe('channels:read,chat:write')
      expect(result.metadata).toEqual({
        teamId: 'T123456',
        teamName: 'Test Team',
        botUserId: 'U123456',
        scope: 'channels:read,chat:write',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://slack.com/api/oauth.v2.access',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: expect.stringContaining('client_id=test_client_id'),
        })
      )
    })

    it('should handle OAuth error responses', async () => {
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

    it('should handle missing authorization code', async () => {
      const params: OAuthCallbackParams = {
        organizationId: 'test_org',
        code: '',
        state: 'test_state',
      }

      await expect(provider.handleCallback(params)).rejects.toThrow(
        'No authorization code received from Slack'
      )
    })

    it('should handle Slack API errors', async () => {
      const mockErrorResponse = {
        ok: false,
        error: 'invalid_code',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse),
      })

      const params: OAuthCallbackParams = {
        organizationId: 'test_org',
        code: 'invalid_code',
        state: 'test_state',
      }

      await expect(provider.handleCallback(params)).rejects.toThrow(
        'Slack token exchange failed: invalid_code'
      )
    })

    it('should handle HTTP errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const params: OAuthCallbackParams = {
        organizationId: 'test_org',
        code: 'test_code',
        state: 'test_state',
      }

      await expect(provider.handleCallback(params)).rejects.toThrow(
        'Failed to exchange code for token: 400 Bad Request'
      )
    })
  })

  describe('refreshToken', () => {
    it('should throw error as Slack does not support token refresh', async () => {
      await expect(provider.refreshToken('refresh_token')).rejects.toThrow(
        'Slack bot tokens do not expire and do not support refresh'
      )
    })
  })

  describe('getConfigSchema', () => {
    it('should return correct configuration schema', () => {
      const schema = provider.getConfigSchema()
      
      expect(schema.type).toBe('object')
      expect(schema.properties).toHaveProperty('teamId')
      expect(schema.properties).toHaveProperty('teamName')
      expect(schema.properties).toHaveProperty('botUserId')
      expect(schema.properties).toHaveProperty('scope')
      expect(schema.required).toEqual(['teamId', 'teamName', 'botUserId'])
    })
  })

  describe('provider metadata', () => {
    it('should have correct provider information', () => {
      expect(provider.name).toBe('slack')
      expect(provider.type).toBe('productivity')
      expect(provider.displayName).toBe('Slack')
      expect(provider.description).toContain('Connect notes to Slack channels')
      expect(provider.logoPath).toContain('slack')
    })
  })
})