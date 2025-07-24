import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SlackProvider } from '../../../src/providers/slack/provider'
import { server } from '../../setup'
import { http, HttpResponse } from 'msw'
import { fixtures } from '../../utils/fixtures'
import type { Integration, NoteIntegrationConnection } from '@prisma/client'

describe('SlackProvider - Message Posting', () => {
  let provider: SlackProvider
  
  beforeEach(() => {
    provider = new SlackProvider()
  })

  describe('postMessage', () => {
    const mockIntegration: Integration = {
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

    const mockConnection: NoteIntegrationConnection & { integration: Integration } = {
      id: 'connection-123',
      noteId: 'note-123',
      integrationId: 'integration-123',
      externalId: 'C1234567890',
      config: JSON.stringify({
        channelName: 'general',
        channelType: 'public',
        postFormat: 'blocks',
        includeContent: true
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
      integration: mockIntegration
    }

    const mockMessageData = {
      title: 'Test Note Title',
      content: 'This is the content of the test note.',
      author: 'Test Author',
      noteUrl: 'https://example.com/notes/123',
      changeType: 'created' as const
    }

    it('should skip posting for mock tokens', async () => {
      const connectionWithMockToken = {
        ...mockConnection,
        integration: {
          ...mockIntegration,
          accessToken: 'mock-slack-token-123456789'
        }
      }

      // Should not throw and should complete successfully
      await expect(provider.postMessage(connectionWithMockToken, mockMessageData)).resolves.toBeUndefined()
    })

    it('should post message with blocks format by default', async () => {
      let requestBody: any
      server.use(
        http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      await provider.postMessage(mockConnection, mockMessageData)

      expect(requestBody.channel).toBe('C1234567890')
      expect(requestBody.username).toBe('Note Bot')
      expect(requestBody.icon_emoji).toBe(':memo:')
      expect(requestBody.blocks).toBeDefined()
      expect(requestBody.text).toBe('✨ Test Note Title was created by Test Author')
      
      // Check blocks structure
      expect(requestBody.blocks[0].type).toBe('section')
      expect(requestBody.blocks[0].text.text).toContain('✨ *Test Note Title* was created by *Test Author*')
      expect(requestBody.blocks[1].text.text).toContain('This is the content of the test note.')
      expect(requestBody.blocks[2].type).toBe('actions')
      expect(requestBody.blocks[2].elements[0].url).toBe('https://example.com/notes/123')
    })

    it('should post message with text format when configured', async () => {
      const textConnection = {
        ...mockConnection,
        config: JSON.stringify({
          channelName: 'general',
          channelType: 'public',
          postFormat: 'text',
          includeContent: true
        })
      }

      let requestBody: any
      server.use(
        http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      await provider.postMessage(textConnection, mockMessageData)

      expect(requestBody.blocks).toBeUndefined()
      expect(requestBody.text).toContain('✨ *Test Note Title* was created by Test Author')
      expect(requestBody.text).toContain('This is the content of the test note.')
      expect(requestBody.text).toContain('<https://example.com/notes/123|View Note>')
    })

    it('should exclude content when configured', async () => {
      const noContentConnection = {
        ...mockConnection,
        config: JSON.stringify({
          channelName: 'general',
          channelType: 'public',
          postFormat: 'blocks',
          includeContent: false
        })
      }

      let requestBody: any
      server.use(
        http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      await provider.postMessage(noContentConnection, mockMessageData)

      // Should only have header and action blocks, no content block
      expect(requestBody.blocks).toHaveLength(3) // header, actions, divider
      expect(requestBody.blocks[1].type).toBe('actions') // Skip content, go straight to actions
    })

    it('should handle different change types with correct emojis', async () => {
      const testCases = [
        { changeType: 'created' as const, emoji: '✨' },
        { changeType: 'updated' as const, emoji: '📝' },
        { changeType: 'deleted' as const, emoji: '🗑️' }
      ]

      for (const testCase of testCases) {
        let requestBody: any
        server.use(
          http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
            requestBody = await request.json()
            return HttpResponse.json(fixtures.slack.postMessageResponse)
          })
        )

        await provider.postMessage(mockConnection, {
          ...mockMessageData,
          changeType: testCase.changeType
        })

        expect(requestBody.text).toContain(`${testCase.emoji} Test Note Title was ${testCase.changeType}`)
      }
    })

    it('should truncate long content', async () => {
      const longContent = 'A'.repeat(600) // Longer than 500 char limit
      
      let requestBody: any
      server.use(
        http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      await provider.postMessage(mockConnection, {
        ...mockMessageData,
        content: longContent
      })

      const contentBlock = requestBody.blocks[1]
      expect(contentBlock.text.text).toHaveLength(500) // 497 chars + '...'
      expect(contentBlock.text.text.endsWith('...')).toBe(true)
    })

    it('should handle invalid URLs by using context instead of buttons', async () => {
      let requestBody: any
      server.use(
        http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      await provider.postMessage(mockConnection, {
        ...mockMessageData,
        noteUrl: 'invalid-url'
      })

      // Should use context block instead of action button
      const contextBlock = requestBody.blocks.find((block: any) => block.type === 'context')
      expect(contextBlock).toBeDefined()
      expect(contextBlock.elements[0].text).toContain('View Note: invalid-url')
    })

    it('should handle missing access token', async () => {
      const connectionWithoutToken = {
        ...mockConnection,
        integration: {
          ...mockIntegration,
          accessToken: null
        }
      }

      await expect(provider.postMessage(connectionWithoutToken, mockMessageData)).rejects.toThrow(
        'No access token available for Slack integration'
      )
    })

    it('should handle Slack API errors with specific error messages', async () => {
      const errorTestCases = [
        { error: 'channel_not_found', expectedMessage: 'Slack channel not found' },
        { error: 'not_in_channel', expectedMessage: 'Bot is not a member of this Slack channel' },
        { error: 'channel_is_archived', expectedMessage: 'Cannot post to archived Slack channel' },
        { error: 'msg_too_long', expectedMessage: 'Message is too long for Slack' },
        { error: 'rate_limited', expectedMessage: 'Slack API rate limit exceeded' },
        { error: 'invalid_auth', expectedMessage: 'Slack authentication failed' },
        { error: 'invalid_blocks', expectedMessage: 'Invalid Slack message format' }
      ]

      for (const testCase of errorTestCases) {
        server.use(
          http.post('https://slack.com/api/chat.postMessage', () => {
            return HttpResponse.json({ ok: false, error: testCase.error })
          })
        )

        await expect(provider.postMessage(mockConnection, mockMessageData)).rejects.toThrow(
          testCase.expectedMessage
        )
      }
    })

    it('should handle HTTP errors', async () => {
      server.use(
        http.post('https://slack.com/api/chat.postMessage', () => {
          return HttpResponse.json({ error: 'server_error' }, { status: 500 })
        })
      )

      await expect(provider.postMessage(mockConnection, mockMessageData)).rejects.toThrow(
        'Slack API HTTP error: 500'
      )
    })

    it('should handle network errors', async () => {
      server.use(
        http.post('https://slack.com/api/chat.postMessage', () => {
          return HttpResponse.error()
        })
      )

      await expect(provider.postMessage(mockConnection, mockMessageData)).rejects.toThrow()
    })

    it('should make correct API request with proper headers', async () => {
      let requestHeaders: Headers
      server.use(
        http.post('https://slack.com/api/chat.postMessage', ({ request }) => {
          requestHeaders = request.headers
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      await provider.postMessage(mockConnection, mockMessageData)

      expect(requestHeaders.get('Authorization')).toBe('Bearer xoxb-real-slack-token')
      expect(requestHeaders.get('Content-Type')).toBe('application/json')
    })

    it('should handle empty or missing content gracefully', async () => {
      let requestBody: any
      server.use(
        http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      await provider.postMessage(mockConnection, {
        ...mockMessageData,
        content: ''
      })

      // Should only have header and action blocks, no content block
      expect(requestBody.blocks).toHaveLength(3) // header, actions, divider
      expect(requestBody.blocks[1].type).toBe('actions')
    })

    it('should handle missing connection config', async () => {
      const connectionWithoutConfig = {
        ...mockConnection,
        config: null
      }

      let requestBody: any
      server.use(
        http.post('https://slack.com/api/chat.postMessage', async ({ request }) => {
          requestBody = await request.json()
          return HttpResponse.json(fixtures.slack.postMessageResponse)
        })
      )

      // Should use default settings (blocks format, include content)
      await provider.postMessage(connectionWithoutConfig, mockMessageData)

      expect(requestBody.blocks).toBeDefined()
      expect(requestBody.blocks[1].text.text).toContain('This is the content of the test note.')
    })
  })
})