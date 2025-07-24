import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlackProvider } from '../../../src/providers/slack/provider'
import { server } from '../../setup'
import { http, HttpResponse } from 'msw'
import { fixtures } from '../../utils/fixtures'
import type { Integration } from '@prisma/client'

describe('SlackProvider - Channel Retrieval', () => {
  let provider: SlackProvider
  
  beforeEach(() => {
    provider = new SlackProvider()
  })

  describe('getAvailableChannels', () => {
    it('should return mock channels for mock tokens', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'mock-slack-token-123456789',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({
          teamId: 'T1234567890',
          teamName: 'Demo Team',
          botUserId: 'U1234567890'
        }),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const channels = await provider.getAvailableChannels(integration)

      expect(channels).toHaveLength(3)
      expect(channels[0]).toEqual({
        id: 'C1234567890',
        name: 'general',
        type: 'public',
        metadata: {
          is_member: true,
          member_count: 42,
          purpose: 'General discussion for the team',
          demo: true
        }
      })
      expect(channels[1]).toEqual({
        id: 'C0987654321',
        name: 'random',
        type: 'public',
        metadata: {
          is_member: true,
          member_count: 25,
          purpose: 'Random conversations and fun',
          demo: true
        }
      })
      expect(channels[2]).toEqual({
        id: 'C1122334455',
        name: 'dev-team',
        type: 'private',
        metadata: {
          is_member: true,
          member_count: 8,
          purpose: 'Development team discussions',
          demo: true
        }
      })
    })

    it('should fetch real channels for real tokens', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({
          teamId: 'T1234567890',
          teamName: 'Test Team',
          botUserId: 'U1234567890'
        }),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const channels = await provider.getAvailableChannels(integration)

      expect(channels).toHaveLength(2)
      expect(channels[0]).toEqual({
        id: 'C1234567890',
        name: 'general',
        type: 'public',
        metadata: {
          is_member: undefined,
          is_archived: false,
          is_private: false,
          member_count: 0,
          purpose: '',
          topic: '',
          bot_needs_invite: true,
          can_post: true
        }
      })
      expect(channels[1]).toEqual({
        id: 'C0987654321',
        name: 'random',
        type: 'public',
        metadata: {
          is_member: undefined,
          is_archived: false,
          is_private: false,
          member_count: 0,
          purpose: '',
          topic: '',
          bot_needs_invite: true,
          can_post: true
        }
      })
    })

    it('should handle pagination for large channel lists', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Mock paginated response
      let callCount = 0
      server.use(
        http.get('https://slack.com/api/conversations.list', ({ request }) => {
          const url = new URL(request.url)
          const cursor = url.searchParams.get('cursor')
          
          callCount++
          
          if (!cursor) {
            // First page
            return HttpResponse.json({
              ok: true,
              channels: [
                {
                  id: 'C1234567890',
                  name: 'general',
                  is_private: false,
                  is_archived: false,
                  is_member: true,
                  num_members: 10
                }
              ],
              response_metadata: {
                next_cursor: 'next-page-cursor'
              }
            })
          } else {
            // Second page
            return HttpResponse.json({
              ok: true,
              channels: [
                {
                  id: 'C0987654321',
                  name: 'random',
                  is_private: false,
                  is_archived: false,
                  is_member: true,
                  num_members: 5
                }
              ]
              // No next_cursor means last page
            })
          }
        })
      )

      const channels = await provider.getAvailableChannels(integration)

      expect(callCount).toBe(2)
      expect(channels).toHaveLength(2)
      expect(channels.map(c => c.name)).toEqual(['general', 'random'])
    })

    it('should filter out archived channels', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      server.use(
        http.get('https://slack.com/api/conversations.list', () => {
          return HttpResponse.json({
            ok: true,
            channels: [
              {
                id: 'C1234567890',
                name: 'general',
                is_private: false,
                is_archived: false,
                is_member: true,
                num_members: 10
              },
              {
                id: 'C0987654321',
                name: 'archived-channel',
                is_private: false,
                is_archived: true,
                is_member: true,
                num_members: 5
              }
            ]
          })
        })
      )

      const channels = await provider.getAvailableChannels(integration)

      expect(channels).toHaveLength(1)
      expect(channels[0].name).toBe('general')
    })

    it('should handle API errors and return fallback channels', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      server.use(
        http.get('https://slack.com/api/conversations.list', () => {
          return HttpResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
        })
      )

      const channels = await provider.getAvailableChannels(integration)

      expect(channels).toHaveLength(2)
      expect(channels[0].metadata?.fallback_reason).toContain('Slack API error: 429')
      expect(channels[0].metadata?.demo).toBe(true)
    })

    it('should handle authentication errors and return demo channels', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      server.use(
        http.get('https://slack.com/api/conversations.list', () => {
          return HttpResponse.json({ ok: false, error: 'invalid_auth' })
        })
      )

      const channels = await provider.getAvailableChannels(integration)

      expect(channels).toHaveLength(3)
      expect(channels[0].metadata?.auth_error).toBe(true)
      expect(channels[0].metadata?.demo).toBe(true)
    })

    it('should handle missing scope errors', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      server.use(
        http.get('https://slack.com/api/conversations.list', () => {
          return HttpResponse.json({ ok: false, error: 'missing_scope' })
        })
      )

      await expect(provider.getAvailableChannels(integration)).rejects.toThrow(
        'Slack integration is missing required permissions'
      )
    })

    it('should handle missing access token', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // The current implementation returns fallback channels instead of throwing
      const channels = await provider.getAvailableChannels(integration)
      expect(channels).toHaveLength(2)
      expect(channels[0].metadata?.fallback_reason).toContain('No access token available')
    })

    it('should sort channels alphabetically', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      server.use(
        http.get('https://slack.com/api/conversations.list', () => {
          return HttpResponse.json({
            ok: true,
            channels: [
              {
                id: 'C3',
                name: 'zebra',
                is_private: false,
                is_archived: false,
                is_member: true
              },
              {
                id: 'C1',
                name: 'alpha',
                is_private: false,
                is_archived: false,
                is_member: true
              },
              {
                id: 'C2',
                name: 'beta',
                is_private: false,
                is_archived: false,
                is_member: true
              }
            ]
          })
        })
      )

      const channels = await provider.getAvailableChannels(integration)

      expect(channels.map(c => c.name)).toEqual(['alpha', 'beta', 'zebra'])
    })

    it('should correctly map private and public channels', async () => {
      const integration: Integration = {
        id: 'integration-123',
        organizationId: 'org-123',
        providerName: 'slack',
        accessToken: 'xoxb-real-slack-token',
        refreshToken: null,
        expiresAt: null,
        config: JSON.stringify({}),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      server.use(
        http.get('https://slack.com/api/conversations.list', () => {
          return HttpResponse.json({
            ok: true,
            channels: [
              {
                id: 'C2',
                name: 'private-channel',
                is_private: true,
                is_archived: false,
                is_member: true
              },
              {
                id: 'C1',
                name: 'public-channel',
                is_private: false,
                is_archived: false,
                is_member: true
              }
            ]
          })
        })
      )

      const channels = await provider.getAvailableChannels(integration)

      expect(channels[0].type).toBe('private')
      expect(channels[1].type).toBe('public')
    })
  })
})