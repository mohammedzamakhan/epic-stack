import { z } from 'zod'

const schema = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test'] as const),
	DATABASE_PATH: z.string(),
	DATABASE_URL: z.string(),
	SESSION_SECRET: z.string(),
	INTERNAL_COMMAND_TOKEN: z.string(),
	HONEYPOT_SECRET: z.string(),
	CACHE_DATABASE_PATH: z.string(),
	// If you plan on using Sentry, remove the .optional()
	SENTRY_DSN: z.string().optional(),
	// If you plan to use Resend, remove the .optional()
	RESEND_API_KEY: z.string().optional(),
	// If you plan to use GitHub auth, remove the .optional()
	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
	GITHUB_REDIRECT_URI: z.string().optional(),
	GITHUB_TOKEN: z.string().optional(),

	// If you plan to use Slack integration, remove the .optional()
	SLACK_CLIENT_ID: z.string().optional(),
	SLACK_CLIENT_SECRET: z.string().optional(),

	// Integration encryption key (required for token security)
	INTEGRATION_ENCRYPTION_KEY: z.string().optional(),

	// OAuth state secret (required for OAuth flow security)
	INTEGRATIONS_OAUTH_STATE_SECRET: z.string().optional(),

	ALLOW_INDEXING: z.enum(['true', 'false']).optional(),

	// Launch status configuration
	LAUNCH_STATUS: z
		.enum(['CLOSED_BETA', 'PUBLIC_BETA', 'LAUNCHED'])
		.optional()
		.default('LAUNCHED'),

	// Tigris Object Storage Configuration
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_REGION: z.string(),
	AWS_ENDPOINT_URL_S3: z.string().url(),
	BUCKET_NAME: z.string(),

	// Discord Integration
	DISCORD_INVITE_URL: z.string().url().optional(),
	DISCORD_CLIENT_ID: z.string().optional(),
	DISCORD_CLIENT_SECRET: z.string().optional(),
	DISCORD_REDIRECT_URI: z.string().url().optional(),
	DISCORD_BOT_TOKEN: z.string().optional(),
	DISCORD_GUILD_ID: z.string().optional(),
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof schema> {}
	}
}

export function init() {
	const parsed = schema.safeParse(process.env)

	if (parsed.success === false) {
		console.error(
			'❌ Invalid environment variables:',
			parsed.error.flatten().fieldErrors,
		)

		throw new Error('Invalid environment variables')
	}
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getEnv() {
	return {
		MODE: process.env.NODE_ENV,
		SENTRY_DSN: process.env.SENTRY_DSN,
		ALLOW_INDEXING: process.env.ALLOW_INDEXING,
	}
}

/**
 * Gets the validated LAUNCH_STATUS environment variable.
 * Returns 'LAUNCHED' as default if not set or invalid.
 * @returns The current launch status: CLOSED_BETA, PUBLIC_BETA, or LAUNCHED
 */
export function getLaunchStatus() {
	const status = process.env.LAUNCH_STATUS
	// Validate against schema enum values
	if (
		status === 'CLOSED_BETA' ||
		status === 'PUBLIC_BETA' ||
		status === 'LAUNCHED'
	) {
		return status
	}
	// Return default value as defined in schema
	return 'LAUNCHED' as const
}

/**
 * Gets the Discord invite URL from environment variables.
 * @returns The Discord invite URL or undefined if not set
 */
export function getDiscordInviteUrl() {
	return process.env.DISCORD_INVITE_URL
}

type ENV = ReturnType<typeof getEnv>

declare global {
	var ENV: ENV
	interface Window {
		ENV: ENV
	}
}
