/**
 * Slack integration provider implementation
 * 
 * Provides OAuth authentication, channel management, and message posting
 * functionality for Slack workspaces.
 */

import type { Integration, NoteIntegrationConnection } from '@prisma/client'
import { BaseIntegrationProvider } from '../provider'
import type {
  TokenData,
  Channel,
  MessageData,
  OAuthCallbackParams,
  ProviderType,
  SlackConfig,
} from '../types'

export class SlackProvider extends BaseIntegrationProvider {
  readonly name = 'slack'
  readonly type: ProviderType = 'productivity'
  readonly displayName = 'Slack'
  readonly description = 'Connect notes to Slack channels and automatically post updates'
  readonly logoPath = 'https://assets-global.website-files.com/621c8d7ad9e04933c4e51ffb/65eba5ffa14998827c92cc01_slack-octothorpe.png'

  private getClientId(): string {
    const clientId = process.env.SLACK_CLIENT_ID
    if (!clientId) {
      throw new Error('SLACK_CLIENT_ID environment variable is not set')
    }
    return clientId
  }

  private getClientSecret(): string {
    const clientSecret = process.env.SLACK_CLIENT_SECRET
    if (!clientSecret) {
      throw new Error('SLACK_CLIENT_SECRET environment variable is not set')
    }
    return clientSecret
  }

  async getAuthUrl(
    organizationId: string,
    redirectUri: string,
    additionalParams?: Record<string, any>
  ): Promise<string> {
    const state = this.generateOAuthState(organizationId, additionalParams)
    
    const params = new URLSearchParams({
      client_id: this.getClientId(),
      scope: 'channels:read,chat:write,channels:history,groups:read',
      redirect_uri: redirectUri,
      state,
      user_scope: '', // We don't need user-level permissions for this integration
    })
    
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`
  }

  async handleCallback(params: OAuthCallbackParams): Promise<TokenData> {
    // Parse and validate state
    const stateData = this.parseOAuthState(params.state)
    
    if (params.error) {
      throw new Error(`Slack OAuth error: ${params.error} - ${params.errorDescription || 'Unknown error'}`)
    }

    if (!params.code) {
      throw new Error('No authorization code received from Slack')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.getClientId(),
        client_secret: this.getClientSecret(),
        code: params.code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error(`Failed to exchange code for token: ${tokenResponse.status} ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json() as any

    if (!tokenData.ok) {
      throw new Error(`Slack token exchange failed: ${tokenData.error || 'Unknown error'}`)
    }

    // Slack OAuth v2 returns bot token and team info
    const config: SlackConfig = {
      teamId: tokenData.team?.id || '',
      teamName: tokenData.team?.name || '',
      botUserId: tokenData.bot_user_id || '',
      scope: tokenData.scope || '',
    }

    return {
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      // Store team info in a way that can be used for configuration
      metadata: config,
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenData> {
    // Slack bot tokens don't expire and don't use refresh tokens
    throw new Error('Slack bot tokens do not expire and do not support refresh')
  }

  async getAvailableChannels(integration: Integration): Promise<Channel[]> {
    try {
      // Get public and private channels
      const [publicChannels, privateChannels] = await Promise.all([
        this.makeSlackRequest(integration, 'conversations.list', {
          types: 'public_channel',
          exclude_archived: true,
          limit: 200,
        }),
        this.makeSlackRequest(integration, 'conversations.list', {
          types: 'private_channel',
          exclude_archived: true,
          limit: 200,
        }),
      ])

      const channels: Channel[] = []

      // Process public channels
      if (publicChannels.channels) {
        for (const channel of publicChannels.channels) {
          channels.push({
            id: channel.id,
            name: channel.name,
            type: 'public',
            metadata: {
              is_member: channel.is_member,
              is_archived: channel.is_archived,
              num_members: channel.num_members,
              purpose: channel.purpose?.value || '',
              topic: channel.topic?.value || '',
            },
          })
        }
      }

      // Process private channels (groups)
      if (privateChannels.channels) {
        for (const channel of privateChannels.channels) {
          channels.push({
            id: channel.id,
            name: channel.name,
            type: 'private',
            metadata: {
              is_member: channel.is_member,
              is_archived: channel.is_archived,
              num_members: channel.num_members,
              purpose: channel.purpose?.value || '',
              topic: channel.topic?.value || '',
            },
          })
        }
      }

      // Sort channels by name for better UX
      return channels.sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      throw new Error(`Failed to fetch Slack channels: ${error.message}`)
    }
  }

  async postMessage(
    connection: NoteIntegrationConnection & { integration: Integration },
    message: MessageData
  ): Promise<void> {
    // Validate message data first
    this.validateMessageData(message)

    try {
      // Use retry logic for posting the message
      await this.retrySlackRequest(async () => {
        // Create message blocks for rich formatting
        const blocks = this.createMessageBlocks(message)
        const fallbackText = this.createFallbackText(message)

        // Parse connection config to get posting preferences
        const connectionConfig = typeof connection.config === 'string' 
          ? JSON.parse(connection.config) 
          : connection.config || {}

        // Determine if we should use blocks or plain text
        const useBlocks = connectionConfig.postFormat !== 'text'
        const includeContent = connectionConfig.includeContent !== false

        // Prepare the message payload
        const messagePayload: any = {
          channel: connection.externalId,
          text: fallbackText, // Always include fallback text
        }

        if (useBlocks && includeContent) {
          messagePayload.blocks = blocks
        } else if (!useBlocks) {
          // For plain text format, create a simple message
          let plainText = fallbackText
          if (includeContent && message.content && message.changeType !== 'deleted') {
            const formattedContent = this.formatMessageContent(message.content, 1000)
            plainText += `\n\n${formattedContent}`
          }
          if (message.noteUrl && message.changeType !== 'deleted') {
            plainText += `\n\nView note: ${message.noteUrl}`
          }
          messagePayload.text = plainText
        }

        // Post the message to Slack
        const response = await this.makeSlackRequest(
          connection.integration,
          'chat.postMessage',
          messagePayload
        )

        // Verify the message was posted successfully
        if (!response.ok) {
          throw new Error(`Failed to post message: ${response.error || 'Unknown error'}`)
        }

        return response
      })

      // Log successful posting (could be used for analytics/debugging)
      console.log(`Successfully posted message to Slack channel ${connection.externalId}`)

    } catch (error) {
      // Enhanced error handling with specific Slack error codes
      let errorMessage = `Failed to post message to Slack: ${error.message}`

      // Handle specific Slack API errors
      if (error.message.includes('channel_not_found')) {
        errorMessage = 'Slack channel not found - the channel may have been deleted or the bot may not have access'
      } else if (error.message.includes('not_in_channel')) {
        errorMessage = 'Bot is not a member of the Slack channel - please invite the bot to the channel'
      } else if (error.message.includes('channel_is_archived')) {
        errorMessage = 'Cannot post to archived Slack channel'
      } else if (error.message.includes('msg_too_long')) {
        errorMessage = 'Message content is too long for Slack'
      } else if (error.message.includes('rate_limited')) {
        errorMessage = 'Slack API rate limit exceeded - please try again later'
      } else if (error.message.includes('invalid_auth')) {
        errorMessage = 'Slack authentication failed - please reconnect the integration'
      }

      throw new Error(errorMessage)
    }
  }

  async validateConnection(
    connection: NoteIntegrationConnection & { integration: Integration }
  ): Promise<boolean> {
    try {
      // Try to get information about the specific channel
      const channelInfo = await this.makeSlackRequest(
        connection.integration,
        'conversations.info',
        {
          channel: connection.externalId,
        }
      )

      // Check if the channel exists and is accessible
      if (!channelInfo.channel) {
        return false
      }

      const channel = channelInfo.channel

      // Check if the channel is archived
      if (channel.is_archived) {
        return false
      }

      // For private channels, check if the bot is a member
      if (channel.is_private && !channel.is_member) {
        return false
      }

      return true
    } catch (error) {
      // If we get a channel_not_found error or similar, the connection is invalid
      if (error.message.includes('channel_not_found') || 
          error.message.includes('not_in_channel') ||
          error.message.includes('access_denied')) {
        return false
      }

      // For other errors, we can't determine validity, so assume it's valid
      // but log the error for debugging
      console.warn(`Could not validate Slack connection: ${error.message}`)
      return true
    }
  }

  getConfigSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        teamId: {
          type: 'string',
          description: 'Slack team/workspace ID',
        },
        teamName: {
          type: 'string',
          description: 'Slack team/workspace name',
        },
        botUserId: {
          type: 'string',
          description: 'Bot user ID for the integration',
        },
        scope: {
          type: 'string',
          description: 'OAuth scopes granted',
        },
      },
      required: ['teamId', 'teamName', 'botUserId'],
    }
  }

  /**
   * Make an authenticated request to the Slack API
   * @param integration - Integration with encrypted access token
   * @param endpoint - Slack API endpoint (without base URL)
   * @param data - Request data (for POST) or query parameters (for GET)
   * @returns Promise resolving to API response
   */
  private async makeSlackRequest(
    integration: Integration,
    endpoint: string,
    data?: Record<string, any>
  ): Promise<any> {
    // Import encryption utilities here to avoid circular dependencies
    const { decryptToken } = await import('../encryption')
    
    const accessToken = await decryptToken(integration.accessToken!)
    
    let url = `https://slack.com/api/${endpoint}`
    const options: RequestInit = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }

    // For most Slack API endpoints, we use GET with query parameters
    // Only specific endpoints like chat.postMessage use POST
    const postEndpoints = ['chat.postMessage', 'chat.update', 'chat.delete', 'chat.scheduleMessage']
    const usePost = postEndpoints.includes(endpoint)

    if (usePost) {
      options.method = 'POST'
      options.headers!['Content-Type'] = 'application/json'
      if (data) {
        options.body = JSON.stringify(data)
      }
    } else {
      options.method = 'GET'
      if (data) {
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined && value !== null) {
            params.append(key, String(value))
          }
        }
        url += `?${params.toString()}`
      }
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      await this.handleApiError(response, `Slack API ${endpoint}`)
    }

    const result = await response.json() as any
    
    if (!result.ok) {
      throw new Error(`Slack API error: ${result.error || 'Unknown error'}`)
    }

    return result
  }

  /**
   * Format message content for Slack, handling truncation and special characters
   * @param content - Raw message content
   * @param maxLength - Maximum length for content (default: 2000)
   * @returns Formatted content suitable for Slack
   */
  private formatMessageContent(content: string, maxLength: number = 2000): string {
    if (!content) return ''

    // Remove or escape Slack-specific formatting characters
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Truncate if too long
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength - 3) + '...'
    }

    return formatted
  }

  /**
   * Create Slack message blocks for rich formatting
   * @param message - Message data to format
   * @returns Slack blocks array
   */
  private createMessageBlocks(message: MessageData): any[] {
    const blocks: any[] = []

    // Header block with note title and action
    const headerText = message.changeType === 'deleted' 
      ? `📝 *${message.title}* was deleted by ${message.author}`
      : `📝 *${message.title}* was ${message.changeType} by ${message.author}`

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: headerText,
      },
    })

    // Content block (if not deleted and content exists)
    if (message.changeType !== 'deleted' && message.content) {
      const formattedContent = this.formatMessageContent(message.content, 1500)
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: formattedContent,
        },
      })
    }

    // Action block with link to note (if not deleted)
    if (message.changeType !== 'deleted' && message.noteUrl) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Note',
              emoji: true,
            },
            url: message.noteUrl,
            action_id: 'view_note',
          },
        ],
      })
    }

    // Add divider for visual separation
    blocks.push({
      type: 'divider',
    })

    return blocks
  }

  /**
   * Create a simple text fallback for clients that don't support blocks
   * @param message - Message data
   * @returns Simple text representation
   */
  private createFallbackText(message: MessageData): string {
    const action = message.changeType === 'deleted' ? 'deleted' : message.changeType
    let text = `Note "${message.title}" was ${action} by ${message.author}`
    
    if (message.changeType !== 'deleted' && message.noteUrl) {
      text += ` - ${message.noteUrl}`
    }
    
    return text
  }

  /**
   * Retry a Slack API request with exponential backoff
   * @param operation - Function that makes the API request
   * @param maxRetries - Maximum number of retry attempts
   * @returns Promise resolving to the API response
   */
  private async retrySlackRequest<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error

        // Don't retry for certain types of errors
        if (
          error.message.includes('channel_not_found') ||
          error.message.includes('not_in_channel') ||
          error.message.includes('channel_is_archived') ||
          error.message.includes('invalid_auth') ||
          error.message.includes('msg_too_long')
        ) {
          throw error
        }

        // Only retry for rate limits and temporary server errors
        if (
          error.message.includes('rate_limited') ||
          error.message.includes('server_error') ||
          error.message.includes('timeout')
        ) {
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt - 1) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }

        // For other errors, don't retry
        throw error
      }
    }

    throw lastError!
  }

  /**
   * Validate message data before posting
   * @param message - Message data to validate
   * @throws Error if message data is invalid
   */
  private validateMessageData(message: MessageData): void {
    if (!message.title || message.title.trim().length === 0) {
      throw new Error('Message title is required')
    }

    if (!message.author || message.author.trim().length === 0) {
      throw new Error('Message author is required')
    }

    if (!['created', 'updated', 'deleted'].includes(message.changeType)) {
      throw new Error('Invalid message change type')
    }

    // Validate title length (Slack has limits)
    if (message.title.length > 200) {
      throw new Error('Message title is too long (max 200 characters)')
    }

    // Validate content length if present
    if (message.content && message.content.length > 10000) {
      throw new Error('Message content is too long (max 10000 characters)')
    }
  }
}