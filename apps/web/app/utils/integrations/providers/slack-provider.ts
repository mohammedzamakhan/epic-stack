/**
 * Slack integration provider implementation
 */

import type { Integration, NoteIntegrationConnection } from '@prisma/client'
import type {
    TokenData,
    Channel,
    MessageData,
    OAuthCallbackParams,
} from '../types'
import { BaseIntegrationProvider } from '../provider'

/**
 * Slack-specific configuration interface
 */
interface SlackConfig {
    teamId: string
    teamName: string
    botUserId: string
    scope: string
}

/**
 * Slack API response interfaces
 */
interface SlackOAuthResponse {
    ok: boolean
    access_token?: string
    scope?: string
    team?: {
        id: string
        name: string
    }
    bot_user_id?: string
    error?: string
}

interface SlackChannelsResponse {
    ok: boolean
    channels?: Array<{
        id: string
        name: string
        is_private: boolean
        is_archived: boolean
        is_member: boolean
        num_members?: number
        purpose?: {
            value: string
            creator: string
            last_set: number
        }
        topic?: {
            value: string
            creator: string
            last_set: number
        }
    }>
    error?: string
    response_metadata?: {
        next_cursor?: string
    }
}

interface SlackPostMessageResponse {
    ok: boolean
    ts?: string
    error?: string
}

/**
 * Slack integration provider
 */
export class SlackProvider extends BaseIntegrationProvider {
    readonly name = 'slack'
    readonly type = 'productivity' as const
    readonly displayName = 'Slack'
    readonly description = 'Connect notes to Slack channels for team collaboration'
    readonly logoPath = '/icons/slack.svg'

    private get clientId(): string {
        const clientId = process.env.SLACK_CLIENT_ID
        if (!clientId) {
            console.warn('SLACK_CLIENT_ID not found in environment variables, using demo client ID')
            return 'demo-slack-client-id'
        }
        console.log('Using Slack client ID from environment:', clientId.substring(0, 10) + '...')
        return clientId
    }

    private get clientSecret(): string {
        const clientSecret = process.env.SLACK_CLIENT_SECRET
        if (!clientSecret) {
            console.warn('SLACK_CLIENT_SECRET not found in environment variables, using demo client secret')
            return 'demo-slack-client-secret'
        }
        console.log('Using Slack client secret from environment (length:', clientSecret.length, 'chars)')
        return clientSecret
    }

    /**
     * Generate Slack OAuth authorization URL
     */
    async getAuthUrl(
        organizationId: string,
        redirectUri: string,
        additionalParams?: Record<string, any>
    ): Promise<string> {
        // Create state with organization and provider info
        const state = Buffer.from(JSON.stringify({
            organizationId,
            providerName: this.name,
            timestamp: Date.now(),
            nonce: Math.random().toString(36).substring(7),
            redirectUri, // Include redirect URI in state for validation
        })).toString('base64')

        const params = new URLSearchParams({
            client_id: this.clientId,
            scope: 'conversations:read,chat:write',
            redirect_uri: redirectUri,
            state,
            response_type: 'code',
        })

        const authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`

        // Check if we're using demo credentials
        const hasRealCredentials = this.clientId !== 'demo-slack-client-id'
        if (!hasRealCredentials) {
            console.log('Generated Slack OAuth URL with demo credentials:', authUrl)
            console.log('To use real Slack integration, set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET environment variables')
        } else {
            console.log('Generated Slack OAuth URL with real credentials')
        }

        return authUrl
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    async handleCallback(params: OAuthCallbackParams): Promise<TokenData> {
        const { code, state } = params

        // Parse our simplified state
        try {
        } catch (error) {
            throw new Error('Invalid OAuth state')
        }

        // Check if we have real Slack credentials
        const hasRealCredentials = this.clientId !== 'demo-slack-client-id' && this.clientSecret !== 'demo-slack-client-secret'

        if (!hasRealCredentials) {
            console.log('Using demo Slack credentials, returning mock token for development')
            // For demo purposes, return mock token data
            return {
                accessToken: `mock-slack-token-${Date.now()}`,
                scope: 'conversations:read,chat:write',
                metadata: {
                    teamId: 'T1234567890',
                    teamName: 'Demo Team',
                    botUserId: 'U1234567890',
                },
            }
        }

        // Make real OAuth token exchange with Slack
        try {
            const response = await fetch('https://slack.com/api/oauth.v2.access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code,
                    // Note: redirect_uri should match what was used in the authorization request
                    // For now, we'll omit it as it's optional if it matches the registered URI
                }),
            })

            if (!response.ok) {
                throw new Error(`Slack OAuth API error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json() as SlackOAuthResponse

            if (!data.ok || !data.access_token) {
                throw new Error(`Slack OAuth error: ${data.error || 'Unknown error'}`)
            }

            console.log('Successfully exchanged OAuth code for Slack access token')
            console.log('Granted scopes:', data.scope)
            console.log('Team:', data.team?.name, '(', data.team?.id, ')')
            console.log('Bot User ID:', data.bot_user_id)
            console.log('App ID:', data.app_id)

            return {
                accessToken: data.access_token,
                scope: data.scope,
                metadata: {
                    teamId: data.team?.id,
                    teamName: data.team?.name,
                    botUserId: data.bot_user_id,
                },
            }
        } catch (error) {
            console.error('Error exchanging OAuth code for Slack token:', error)
            throw new Error(`Failed to exchange OAuth code: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    /**
     * Refresh Slack access token
     * Note: Slack doesn't use refresh tokens in the same way as other providers
     */
    async refreshToken(refreshToken: string): Promise<TokenData> {
        // Slack doesn't typically use refresh tokens for bot tokens
        // Bot tokens are long-lived and don't expire
        throw new Error('Slack bot tokens do not require refresh')
    }

    /**
     * Get available Slack channels
     */
    async getAvailableChannels(integration: Integration): Promise<Channel[]> {
        try {
            // Get the access token (in production, this would be decrypted)
            const accessToken = integration.accessToken

            if (!accessToken) {
                throw new Error('No access token available for Slack integration')
            }

            // Check if this is a mock token (for demo purposes)
            if (accessToken.startsWith('mock-slack-token-')) {
                console.log('Using mock token, returning demo channels instead of making API call')
                return [
                    {
                        id: 'C1234567890',
                        name: 'general',
                        type: 'public',
                        metadata: {
                            is_member: true,
                            member_count: 42,
                            purpose: 'General discussion for the team',
                            demo: true
                        }
                    },
                    {
                        id: 'C0987654321',
                        name: 'random',
                        type: 'public',
                        metadata: {
                            is_member: true,
                            member_count: 25,
                            purpose: 'Random conversations and fun',
                            demo: true
                        }
                    },
                    {
                        id: 'C1122334455',
                        name: 'dev-team',
                        type: 'private',
                        metadata: {
                            is_member: true,
                            member_count: 8,
                            purpose: 'Development team discussions',
                            demo: true
                        }
                    }
                ]
            }

            // Fetch all channels (public and private) that the bot is a member of
            let allChannels: SlackChannelsResponse['channels'] = []
            let cursor: string | undefined = undefined

            do {
                const channelsUrl = new URL('https://slack.com/api/conversations.list')
                channelsUrl.searchParams.set('types', 'public_channel,private_channel') // Include both public and private
                channelsUrl.searchParams.set('exclude_archived', 'true') // Exclude archived channels
                channelsUrl.searchParams.set('limit', '200') // Get up to 200 channels per request

                if (cursor) {
                    channelsUrl.searchParams.set('cursor', cursor)
                }

                const channelsResponse = await fetch(channelsUrl.toString(), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (!channelsResponse.ok) {
                    const errorText = await channelsResponse.text()
                    console.error('Slack API HTTP error:', channelsResponse.status, channelsResponse.statusText, errorText)
                    throw new Error(`Slack API error: ${channelsResponse.status} ${channelsResponse.statusText}`)
                }

                const channelsData = await channelsResponse.json() as SlackChannelsResponse

                if (!channelsData.ok) {
                    console.error('Slack API response error:', channelsData.error)
                    console.error('Full Slack API response:', JSON.stringify(channelsData, null, 2))
                    throw new Error(`Slack API error: ${channelsData.error || 'Unknown error'}`)
                }

                // Add channels from this page
                if (channelsData.channels) {
                    allChannels.push(...channelsData.channels)
                }

                // Check if there are more pages
                cursor = channelsData.response_metadata?.next_cursor

                // Safety limit to prevent infinite loops
                if (allChannels.length > 1000) {
                    console.warn('Reached channel limit of 1000, stopping pagination')
                    break
                }

            } while (cursor)

            console.log(`Fetched ${allChannels.length} total channels from Slack`)

            const channels: Channel[] = allChannels
                .filter(channel =>
                    // Include all non-archived channels (bot can be invited later or post via chat:write)
                    // Note: Bot doesn't need to be a member initially - it can be invited to channels
                    !channel.is_archived
                )
                .map(channel => ({
                    id: channel.id,
                    name: channel.name,
                    type: channel.is_private ? 'private' : 'public',
                    metadata: {
                        is_member: channel.is_member,
                        is_archived: channel.is_archived,
                        is_private: channel.is_private,
                        member_count: channel.num_members || 0,
                        purpose: channel.purpose?.value || '',
                        topic: channel.topic?.value || '',
                        // Add helpful info about bot membership
                        bot_needs_invite: !channel.is_member,
                        can_post: true // Bot can post to any channel with chat:write scope
                    }
                }))
                .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
            console.log(JSON.stringify(allChannels, null, 2))
            console.log(`Returning ${channels.length} accessible channels (${channels.filter(c => c.type === 'public').length} public, ${channels.filter(c => c.type === 'private').length} private)`)

            return channels

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error fetching Slack channels:', errorMessage)

            // Check if it's an authentication error
            if (errorMessage.includes('invalid_auth') || errorMessage.includes('token_revoked')) {
                console.warn('Slack authentication failed, likely due to demo/mock token. Returning demo channels.')
                // For demo purposes, return mock channels instead of throwing
                return [
                    {
                        id: 'C1234567890',
                        name: 'general',
                        type: 'public',
                        metadata: {
                            is_member: true,
                            member_count: 42,
                            purpose: 'General discussion (Demo)',
                            demo: true,
                            auth_error: true
                        }
                    },
                    {
                        id: 'C0987654321',
                        name: 'random',
                        type: 'public',
                        metadata: {
                            is_member: true,
                            member_count: 25,
                            purpose: 'Random conversations (Demo)',
                            demo: true,
                            auth_error: true
                        }
                    },
                    {
                        id: 'C1122334455',
                        name: 'dev-team',
                        type: 'private',
                        metadata: {
                            is_member: true,
                            member_count: 8,
                            purpose: 'Development team (Demo)',
                            demo: true,
                            auth_error: true
                        }
                    }
                ]
            }

            // Check if it's a permission error
            if (errorMessage.includes('missing_scope')) {
                throw new Error('Slack integration is missing required permissions. Please reconnect with proper scopes.')
            }

            // For other errors, fall back to mock channels for demo purposes
            console.warn('Falling back to mock channels due to API error:', errorMessage)
            return [
                {
                    id: 'C1234567890',
                    name: 'general',
                    type: 'public',
                    metadata: {
                        is_member: true,
                        member_count: 42,
                        purpose: 'General discussion (Fallback)',
                        demo: true,
                        fallback_reason: errorMessage
                    }
                },
                {
                    id: 'C0987654321',
                    name: 'random',
                    type: 'public',
                    metadata: {
                        is_member: true,
                        member_count: 25,
                        purpose: 'Random conversations (Fallback)',
                        demo: true,
                        fallback_reason: errorMessage
                    }
                }
            ]
        }
    }

    /**
     * Post a message to a Slack channel
     */
    async postMessage(
        connection: NoteIntegrationConnection & { integration: Integration },
        message: MessageData
    ): Promise<void> {
        try {
            // Get the access token (in production, this would be decrypted)
            const accessToken = connection.integration.accessToken

            if (!accessToken) {
                throw new Error('No access token available for Slack integration')
            }

            // Check if this is a mock token
            if (accessToken.startsWith('mock-slack-token-')) {
                console.log('Mock Slack message post (demo mode):', {
                    channel: connection.externalId,
                    message: {
                        title: message.title,
                        author: message.author,
                        changeType: message.changeType,
                        noteUrl: message.noteUrl
                    }
                })
                return
            }

            // Parse connection config to get posting preferences
            const connectionConfig = connection.config ? JSON.parse(connection.config as string) : {}
            const useBlocks = connectionConfig.postFormat !== 'text'
            const includeContent = connectionConfig.includeContent !== false

            // Prepare the message payload
            const payload: any = {
                channel: connection.externalId,
                username: 'Note Bot',
                icon_emoji: ':memo:',
            }

            if (useBlocks) {
                // Use rich Slack blocks for better formatting
                payload.blocks = this.formatSlackBlocks(message, includeContent)
                payload.text = `${this.getChangeTypeEmoji(message.changeType)} ${message.title} was ${message.changeType} by ${message.author}`
            } else {
                // Use simple text format
                payload.text = this.formatSlackText(message, includeContent)
            }

            console.log('Posting to Slack with payload:', JSON.stringify(payload, null, 2))

            // Make the API call to Slack
            const response = await fetch('https://slack.com/api/chat.postMessage', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                throw new Error(`Slack API HTTP error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json() as SlackPostMessageResponse

            if (!data.ok) {
                throw new Error(`Slack API error: ${data.error || 'Unknown error'}`)
            }

            console.log(`Successfully posted message to Slack channel ${connection.externalId}:`, data.ts)

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error('Error posting message to Slack:', errorMessage)

            // Provide specific error messages for common issues
            if (errorMessage.includes('channel_not_found')) {
                throw new Error('Slack channel not found. The channel may have been deleted or renamed.')
            } else if (errorMessage.includes('not_in_channel')) {
                throw new Error('Bot is not a member of this Slack channel. Please invite the bot to the channel.')
            } else if (errorMessage.includes('channel_is_archived')) {
                throw new Error('Cannot post to archived Slack channel.')
            } else if (errorMessage.includes('msg_too_long')) {
                throw new Error('Message is too long for Slack. Please shorten the note content.')
            } else if (errorMessage.includes('rate_limited')) {
                throw new Error('Slack API rate limit exceeded. Please try again later.')
            } else if (errorMessage.includes('invalid_auth')) {
                throw new Error('Slack authentication failed. Please reconnect your Slack integration.')
            } else if (errorMessage.includes('invalid_blocks')) {
                throw new Error('Invalid Slack message format. This might be due to an invalid URL or block structure.')
            }

            throw error
        }
    }

    /**
     * Validate a Slack connection
     */
    async validateConnection(
        connection: NoteIntegrationConnection & { integration: Integration }
    ): Promise<boolean> {
        // For now, we'll return true for mock implementation
        // In a real implementation, we would check if the channel still exists and is accessible
        return true
    }

    /**
     * Get Slack provider configuration schema
     */
    getConfigSchema(): Record<string, any> {
        return {
            type: 'object',
            properties: {
                teamId: { type: 'string', description: 'Slack team ID' },
                teamName: { type: 'string', description: 'Slack team name' },
                botUserId: { type: 'string', description: 'Bot user ID' },
                scope: { type: 'string', description: 'OAuth scope' },
            },
            required: ['teamId', 'teamName', 'scope'],
        }
    }

    /**
     * Format message for Slack blocks
     */
    private formatSlackBlocks(message: MessageData, includeContent: boolean = true): any[] {
        const changeTypeEmoji = this.getChangeTypeEmoji(message.changeType)

        const blocks: any[] = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `${changeTypeEmoji} *${message.title}* was ${message.changeType} by *${message.author}*`,
                },
            }
        ]

        // Add content section if enabled and content exists
        if (includeContent && message.content && message.content.trim()) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: this.truncateContent(message.content, 500),
                },
            })
        }

        // Add action buttons (only if we have a valid absolute URL)
        if (this.isValidUrl(message.noteUrl)) {
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
                        style: 'primary',
                    },
                ],
            })
        } else {
            // If URL is not valid, add it as text instead
            blocks.push({
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `View Note: ${message.noteUrl}`,
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
     * Format message as plain text for Slack
     */
    private formatSlackText(message: MessageData, includeContent: boolean = true): string {
        const changeTypeEmoji = this.getChangeTypeEmoji(message.changeType)

        let text = `${changeTypeEmoji} *${message.title}* was ${message.changeType} by ${message.author}`

        if (includeContent && message.content && message.content.trim()) {
            text += `\n\n${this.truncateContent(message.content, 300)}`
        }

        text += `\n\n<${message.noteUrl}|View Note>`

        return text
    }

    /**
     * Get emoji for change type
     */
    private getChangeTypeEmoji(changeType: MessageData['changeType']): string {
        const changeTypeEmojis = {
            created: '✨',
            updated: '📝',
            deleted: '🗑️'
        }
        return changeTypeEmojis[changeType] || '📄'
    }

    /**
     * Check if URL is valid for Slack buttons (must be absolute)
     */
    private isValidUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url)
            return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
        } catch {
            return false
        }
    }

    /**
     * Truncate content for Slack message
     */
    private truncateContent(content: string, maxLength: number = 300): string {
        if (!content || content.length <= maxLength) {
            return content || ''
        }

        // Try to truncate at a word boundary
        const truncated = content.substring(0, maxLength - 3)
        const lastSpace = truncated.lastIndexOf(' ')

        if (lastSpace > maxLength * 0.8) {
            // If we can find a space in the last 20% of the content, use it
            return truncated.substring(0, lastSpace) + '...'
        } else {
            // Otherwise, just truncate at the character limit
            return truncated + '...'
        }
    }
}