export { ENV } from 'varlock/env'
import { ENV } from 'varlock/env'

export function getEnv() {
	return {
		MODE: ENV.NODE_ENV,
		SENTRY_DSN: ENV.SENTRY_DSN,
		ALLOW_INDEXING: String(ENV.ALLOW_INDEXING),
	}
}

export function getLaunchStatus() {
	return ENV.LAUNCH_STATUS
}

export function getDiscordInviteUrl() {
	return ENV.DISCORD_INVITE_URL
}
