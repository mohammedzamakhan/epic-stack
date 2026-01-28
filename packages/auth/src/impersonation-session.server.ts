import crypto from 'node:crypto'
import { createCookieSessionStorage } from 'react-router'

const IMPERSONATION_SESSION_TTL = 15 * 60 * 1000 // 15 minutes in milliseconds
export const IMPERSONATION_COOKIE_MAX_AGE = 15 * 60 // 15 minutes in seconds

function getImpersonationSecret(): string {
	const secret =
		process.env.IMPERSONATION_SESSION_SECRET || process.env.SESSION_SECRET
	if (!secret) {
		throw new Error(
			'IMPERSONATION_SESSION_SECRET or SESSION_SECRET environment variable is required',
		)
	}
	return secret
}

const impersonationSecrets = getImpersonationSecret()
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean)

if (impersonationSecrets.length === 0) {
	throw new Error(
		'Impersonation session secret must contain at least one non-empty secret',
	)
}

export const impersonationSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'en_imp_session',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		domain: process.env.ROOT_APP ? `.${process.env.ROOT_APP}` : undefined,
		secrets: impersonationSecrets,
		secure: process.env.NODE_ENV === 'production',
	},
})

export const impersonationSessionKey = 'impersonationSessionId'

export function getImpersonationExpirationDate(): Date {
	return new Date(Date.now() + IMPERSONATION_SESSION_TTL)
}

export function getClientIp(request: Request): string {
	const cfConnectingIp = request.headers.get('cf-connecting-ip')
	if (cfConnectingIp) return cfConnectingIp.trim()

	const xForwardedFor = request.headers.get('x-forwarded-for')
	if (xForwardedFor) {
		const firstIp = xForwardedFor.split(',')[0]
		if (firstIp) return firstIp.trim()
	}

	const xRealIp = request.headers.get('x-real-ip')
	if (xRealIp) return xRealIp.trim()

	return 'unknown'
}

export function hashIp(ip: string): string {
	const secret = getImpersonationSecret().split(',')[0] || ''
	return crypto.createHmac('sha256', secret).update(ip).digest('hex')
}
