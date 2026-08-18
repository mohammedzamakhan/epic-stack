import crypto from 'node:crypto'
import { ENV } from 'varlock/env'

const INSECURE_SECRET_MARKERS = [
	'your-jwt-secret',
	'do-not-use-in-prod',
	'change-me',
]

function isInsecureSecret(value: string) {
	const lower = value.toLowerCase()
	return INSECURE_SECRET_MARKERS.some((marker) => lower.includes(marker))
}

export function getBearerToken(header: string | undefined) {
	return header?.startsWith('Bearer ') ? header.substring(7) : ''
}

export function timingSafeEqualString(left: string, right: string) {
	const leftHash = crypto.createHash('sha256').update(left).digest()
	const rightHash = crypto.createHash('sha256').update(right).digest()
	return crypto.timingSafeEqual(leftHash, rightHash)
}

export function assertTenantApiSecrets() {
	const internalToken = ENV.INTERNAL_COMMAND_TOKEN || ''
	const jwtSecret = ENV.JWT_SECRET || ''
	const hmacSecret = process.env.AUTH_HMAC_SECRET || ''
	const isProd = process.env.NODE_ENV === 'production'

	if (internalToken.length < 16) {
		throw new Error(
			'INTERNAL_COMMAND_TOKEN must be set to at least 16 characters',
		)
	}
	if (jwtSecret.length < 16 || (isProd && isInsecureSecret(jwtSecret))) {
		throw new Error(
			'JWT_SECRET is missing, too short, or using a default value',
		)
	}
	if (hmacSecret.length < 16 || (isProd && isInsecureSecret(hmacSecret))) {
		throw new Error(
			'AUTH_HMAC_SECRET is missing, too short, or using a default value',
		)
	}
	if (isProd && isInsecureSecret(internalToken)) {
		throw new Error('INTERNAL_COMMAND_TOKEN is using a development default')
	}
}

export function hmacHash(value: string) {
	const hmacSecret = process.env.AUTH_HMAC_SECRET || ''
	if (hmacSecret.length < 16) {
		throw new Error('AUTH_HMAC_SECRET is not configured')
	}
	return crypto.createHmac('sha256', hmacSecret).update(value).digest('hex')
}
