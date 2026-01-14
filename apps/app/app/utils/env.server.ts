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
