/**
 * SSO Configuration utilities and feature flags
 */

/**
 * Checks if SSO is enabled via environment variable
 */
export function isSSOEnabled(): boolean {
	return process.env.SSO_ENABLED === 'true'
}

/**
 * Gets the SSO encryption key from environment variables
 * This is used for encrypting sensitive SSO configuration data
 */
export function getSSOMasterKey(): string {
	const key = process.env.SSO_ENCRYPTION_KEY
	if (!key) {
		throw new Error('SSO_ENCRYPTION_KEY environment variable is not set')
	}
	return key
}

/**
 * SSO feature configuration
 */
export const ssoConfig = {
	enabled: isSSOEnabled(),
	encryptionKey: getSSOMasterKey,
} as const
