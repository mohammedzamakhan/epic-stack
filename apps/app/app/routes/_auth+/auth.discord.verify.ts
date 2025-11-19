import { redirect } from 'react-router'
import { requireUserId } from '#app/utils/auth.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { awardDiscordPoints } from '#app/utils/waitlist.server.ts'
import { type Route } from './+types/auth.discord.verify.ts'

// Discord API response types
interface DiscordTokenResponse {
	access_token: string
	token_type: string
	expires_in: number
	refresh_token: string
	scope: string
}

interface DiscordGuild {
	id: string
	name: string
	icon: string | null
	owner: boolean
	permissions: string
	features: string[]
}

/**
 * Discord OAuth verification route for waitlist
 * This route handles the OAuth callback from Discord and verifies
 * that the user is a member of the configured Discord server.
 */
export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const url = new URL(request.url)
	const code = url.searchParams.get('code')
	const error = url.searchParams.get('error')

	// Handle OAuth errors
	if (error) {
		console.error('Discord OAuth error:', error)
		return redirectWithToast('/waitlist', {
			type: 'error',
			title: 'Discord Verification Failed',
			description:
				'There was an error connecting to Discord. Please try again.',
		})
	}

	// If no code, redirect to initiate OAuth flow
	if (!code) {
		const clientId = process.env.DISCORD_CLIENT_ID
		const redirectUri = process.env.DISCORD_REDIRECT_URI

		if (!clientId || !redirectUri) {
			console.error('Discord OAuth not configured')
			return redirectWithToast('/waitlist', {
				type: 'error',
				title: 'Discord Not Configured',
				description: 'Discord OAuth is not configured. Please contact support.',
			})
		}

		// Build Discord OAuth URL
		const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize')
		discordAuthUrl.searchParams.set('client_id', clientId)
		discordAuthUrl.searchParams.set('redirect_uri', redirectUri)
		discordAuthUrl.searchParams.set('response_type', 'code')
		discordAuthUrl.searchParams.set('scope', 'identify guilds')
		discordAuthUrl.searchParams.set('state', userId) // Store userId in state for verification

		return redirect(discordAuthUrl.toString())
	}

	// Exchange code for access token
	try {
		const clientId = process.env.DISCORD_CLIENT_ID
		const clientSecret = process.env.DISCORD_CLIENT_SECRET
		const redirectUri = process.env.DISCORD_REDIRECT_URI
		const guildId = process.env.DISCORD_GUILD_ID

		if (!clientId || !clientSecret || !redirectUri || !guildId) {
			throw new Error('Discord OAuth not fully configured')
		}

		// Exchange authorization code for access token
		const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				grant_type: 'authorization_code',
				code: code,
				redirect_uri: redirectUri,
			}),
		})

		if (!tokenResponse.ok) {
			throw new Error('Failed to exchange code for token')
		}

		const tokenData = (await tokenResponse.json()) as DiscordTokenResponse
		const accessToken = tokenData.access_token

		// Fetch user's guilds (servers)
		const guildsResponse = await fetch(
			'https://discord.com/api/users/@me/guilds',
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		)

		if (!guildsResponse.ok) {
			throw new Error('Failed to fetch user guilds')
		}

		const guilds = (await guildsResponse.json()) as DiscordGuild[]

		// Check if user is in the specified guild
		const isInGuild = guilds.some((guild) => guild.id === guildId)

		if (!isInGuild) {
			return redirectWithToast('/waitlist', {
				type: 'error',
				title: 'Not in Discord Server',
				description:
					'Please join our Discord server first, then verify your membership.',
			})
		}

		// Award points for Discord verification
		await awardDiscordPoints(userId)

		return redirectWithToast('/waitlist', {
			type: 'success',
			title: 'Discord Verified!',
			description: 'You have earned 2 points for joining our Discord server!',
		})
	} catch (error) {
		console.error('Discord verification error:', error)
		return redirectWithToast('/waitlist', {
			type: 'error',
			title: 'Verification Failed',
			description:
				error instanceof Error
					? error.message
					: 'Failed to verify Discord membership. Please try again.',
		})
	}
}
