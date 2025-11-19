import crypto from 'node:crypto'
import { type Connection, type Password, type User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'
import { Authenticator } from 'remix-auth'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { AuditAction, AuditService } from './audit.server.ts'
import { providers } from './connections.server.ts'
import { prisma } from './db.server.ts'
import { combineHeaders, downloadFile } from './misc.tsx'
import { type ProviderUser } from './providers/provider.ts'
import { authSessionStorage } from './session.server.ts'
import { ssoAuthService } from './sso-auth.server.ts'
import { uploadProfileImage } from './storage.server.ts'
import { getUtmParams } from './utm.server.ts'

// Initialize audit service
const auditService = new AuditService()

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30 // 30 days
export const SESSION_INACTIVITY_TIMEOUT = 1000 * 60 * 30 // 30 minutes (SOC2 compliant)
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'

export const authenticator = new Authenticator<ProviderUser>()

// Register existing OAuth providers (GitHub, Google, etc.)
for (const [providerName, provider] of Object.entries(providers)) {
	const strategy = provider.getAuthStrategy()
	if (strategy) {
		authenticator.use(strategy, providerName)
	}
}

/**
 * Get or register an SSO strategy for an organization
 * This creates dynamic strategies based on organization SSO configuration
 */
export async function getSSOStrategy(organizationId: string) {
	const strategyName = `sso-${organizationId}`

	// Check if strategy is already registered
	try {
		// Try to get the existing strategy - this will throw if not found
		const existingStrategy = (authenticator as any)._strategies.get(
			strategyName,
		)
		if (existingStrategy) {
			return strategyName
		}
	} catch {
		// Strategy doesn't exist, we'll create it below
	}

	// Get the SSO strategy from the service
	const strategy = await ssoAuthService.getStrategy(organizationId)
	if (!strategy) {
		return null
	}

	// Register the strategy with the authenticator
	authenticator.use(strategy, strategyName)

	return strategyName
}

/**
 * Refresh an SSO strategy when configuration changes
 */
export async function refreshSSOStrategy(organizationId: string) {
	const strategyName = `sso-${organizationId}`

	// Remove existing strategy if it exists
	try {
		;(authenticator as any)._strategies.delete(strategyName)
	} catch {
		// Strategy might not exist, that's fine
	}

	// Refresh the strategy in the SSO service
	await ssoAuthService.refreshStrategy(organizationId)

	// Re-register the strategy
	return getSSOStrategy(organizationId)
}

export async function getUserId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	if (!sessionId) return null
	const session = await prisma.session.findUnique({
		select: {
			userId: true,
			lastActivityAt: true,
			user: {
				select: {
					isBanned: true,
					banExpiresAt: true,
				},
			},
		},
		where: { id: sessionId, expirationDate: { gt: new Date() } },
	})
	if (!session?.userId) {
		throw redirect('/login', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		})
	}

	// Check session inactivity timeout (SOC2 compliance)
	const now = new Date()
	const lastActivity = session.lastActivityAt
	const timeSinceActivity = now.getTime() - lastActivity.getTime()

	if (timeSinceActivity > SESSION_INACTIVITY_TIMEOUT) {
		// Session has been inactive too long - delete and redirect to login
		await prisma.session.delete({ where: { id: sessionId } })
		await auditService.log({
			action: AuditAction.SESSION_EXPIRED,
			userId: session.userId,
			details: 'Session expired due to inactivity',
			metadata: {
				sessionId,
				inactiveFor: Math.floor(timeSinceActivity / 1000 / 60) + ' minutes'
			},
			request,
			severity: 'info',
		})
		throw redirect('/login?reason=inactivity', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		})
	}

	// Update lastActivityAt to track ongoing activity
	await prisma.session.update({
		where: { id: sessionId },
		data: { lastActivityAt: now },
	})

	// Check if user is banned
	if (session.user.isBanned) {
		// Check if ban has expired
		const now = new Date()
		const banExpired =
			session.user.banExpiresAt && new Date(session.user.banExpiresAt) <= now

		if (banExpired) {
			// Automatically lift expired ban
			await prisma.user.update({
				where: { id: session.userId },
				data: {
					isBanned: false,
					banReason: null,
					banExpiresAt: null,
					bannedAt: null,
					bannedById: null,
				},
			})
		} else {
			// User is still banned, destroy session and redirect
			await prisma.session.deleteMany({ where: { userId: session.userId } })
			throw redirect('/login?banned=true', {
				headers: {
					'set-cookie': await authSessionStorage.destroySession(authSession),
				},
			})
		}
	}

	return session.userId
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const userId = await getUserId(request)
	if (!userId) {
		const requestUrl = new URL(request.url)
		redirectTo =
			redirectTo === null
				? null
				: (redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`)
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
		const loginRedirect = ['/login', loginParams?.toString()]
			.filter(Boolean)
			.join('?')
		throw redirect(loginRedirect)
	}
	return userId
}

export async function requireAnonymous(request: Request) {
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/')
	}
}

// Helper to check if a user is allowed to login (and auto-lift expired bans)
export async function canUserLogin(userId: string): Promise<boolean> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { isBanned: true, banExpiresAt: true },
	})
	if (!user) return false

	if (!user.isBanned) return true

	const now = new Date()
	const banExpired = user.banExpiresAt && new Date(user.banExpiresAt) <= now

	if (banExpired) {
		await prisma.user.update({
			where: { id: userId },
			data: {
				isBanned: false,
				banReason: null,
				banExpiresAt: null,
				bannedAt: null,
				bannedById: null,
			},
		})
		return true
	}

	return false
}

export async function login({
	username,
	password,
	request,
}: {
	username: string
	password: string
	request?: Request
}) {
	// Configuration for failed login tracking (SOC2 compliance)
	const MAX_FAILED_ATTEMPTS = 5
	const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

	// Try to find user by username or email
	let userWithLockInfo = null
	const isEmail = username.includes('@')

	// First, check if account exists and is locked (before password verification)
	userWithLockInfo = await prisma.user.findFirst({
		where: isEmail ? { email: username } : { username },
		select: {
			id: true,
			email: true,
			username: true,
			failedLoginAttempts: true,
			lastFailedLoginAt: true,
			accountLockedUntil: true,
		},
	})

	// If user exists, check if account is locked
	if (userWithLockInfo) {
		const now = new Date()
		if (
			userWithLockInfo.accountLockedUntil &&
			userWithLockInfo.accountLockedUntil > now
		) {
			// Account is still locked - log and reject
			await auditService.log({
				action: AuditAction.USER_LOGIN_FAILED,
				userId: userWithLockInfo.id,
				details: `Login attempt failed: Account locked until ${userWithLockInfo.accountLockedUntil.toISOString()}`,
				metadata: { username, reason: 'account_locked' },
				request,
				severity: 'warning',
			})
			return null
		}

		// If lock has expired, reset failed attempts
		if (
			userWithLockInfo.accountLockedUntil &&
			userWithLockInfo.accountLockedUntil <= now
		) {
			await prisma.user.update({
				where: { id: userWithLockInfo.id },
				data: {
					failedLoginAttempts: 0,
					accountLockedUntil: null,
					lastFailedLoginAt: null,
				},
			})
		}
	}

	// Now try to verify password
	let user = null
	if (username.includes('@')) {
		// Looks like an email, try email first
		user = await verifyUserPassword({ email: username }, password)
		if (!user) {
			// If email fails, try as username (in case someone has @ in their username)
			user = await verifyUserPassword({ username }, password)
		}
	} else {
		// Looks like a username, try username first
		user = await verifyUserPassword({ username }, password)
		if (!user) {
			// If username fails, try as email (in case it's a short email)
			user = await verifyUserPassword({ email: username }, password)
		}
	}

	// Handle failed login attempt
	if (!user) {
		if (userWithLockInfo) {
			const newFailedAttempts = (userWithLockInfo.failedLoginAttempts || 0) + 1
			const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS

			await prisma.user.update({
				where: { id: userWithLockInfo.id },
				data: {
					failedLoginAttempts: newFailedAttempts,
					lastFailedLoginAt: new Date(),
					...(shouldLock && {
						accountLockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
					}),
				},
			})

			// Log failed login attempt with appropriate severity
			await auditService.log({
				action: AuditAction.USER_LOGIN_FAILED,
				userId: userWithLockInfo.id,
				details: shouldLock
					? `Login failed: Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts`
					: `Login failed: Invalid password (attempt ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS})`,
				metadata: {
					username,
					failedAttempts: newFailedAttempts,
					accountLocked: shouldLock,
					reason: 'invalid_credentials',
				},
				request,
				severity: shouldLock ? 'error' : 'warning',
			})
		} else {
			// User doesn't exist - log without user ID to prevent enumeration
			await auditService.log({
				action: AuditAction.USER_LOGIN_FAILED,
				details: `Login attempt failed: User not found`,
				metadata: { username, reason: 'user_not_found' },
				request,
				severity: 'info',
			})
		}
		return null
	}

	// Check if user can login (banned, etc.)
	const canLogin = await canUserLogin(user.id)
	if (!canLogin) {
		await auditService.log({
			action: AuditAction.USER_LOGIN_FAILED,
			userId: user.id,
			details: 'Login failed: User is banned or suspended',
			metadata: { username, reason: 'user_banned' },
			request,
			severity: 'warning',
		})
		return null
	}

	// Successful login - reset failed attempts and create session
	await prisma.user.update({
		where: { id: user.id },
		data: {
			failedLoginAttempts: 0,
			lastFailedLoginAt: null,
			accountLockedUntil: null,
		},
	})

	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})

	// Log successful login
	await auditService.log({
		action: AuditAction.USER_LOGIN,
		userId: user.id,
		details: 'User logged in successfully',
		metadata: { username, loginMethod: 'password' },
		request,
		severity: 'info',
	})

	return session
}

export async function resetUserPassword({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)
	return prisma.user.update({
		where: { username },
		data: {
			password: {
				update: {
					hash: hashedPassword,
				},
			},
		},
	})
}

export async function signup({
	email,
	username,
	password,
	name,
	request,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	password: string
	request?: Request
}) {
	const hashedPassword = await getPasswordHash(password)

	// Get UTM parameters from cookies if request is provided
	const utmParams = request ? await getUtmParams(request) : null

	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			user: {
				create: {
					email: email.toLowerCase(),
					username: username.toLowerCase(),
					name,
					roles: { connect: { name: 'user' } },
					password: {
						create: {
							hash: hashedPassword,
						},
					},
					// Add UTM source if available
					...(utmParams && {
						utmSource: {
							create: {
								source: utmParams.source,
								medium: utmParams.medium,
								campaign: utmParams.campaign,
								term: utmParams.term,
								content: utmParams.content,
								referrer: utmParams.referrer,
							},
						},
					}),
				},
			},
		},
		select: { id: true, expirationDate: true, userId: true },
	})

	return session
}

export async function signupWithConnection({
	email,
	username,
	name,
	providerId,
	providerName,
	imageUrl,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	providerId: Connection['providerId']
	providerName: Connection['providerName']
	imageUrl?: string
}) {
	const user = await prisma.user.create({
		data: {
			email: email.toLowerCase(),
			username: username.toLowerCase(),
			name,
			roles: { connect: { name: 'user' } },
			connections: { create: { providerId, providerName } },
		},
		select: { id: true },
	})

	if (imageUrl) {
		const imageFile = await downloadFile(imageUrl)
		await prisma.user.update({
			where: { id: user.id },
			data: {
				image: {
					create: {
						objectKey: await uploadProfileImage(user.id, imageFile),
					},
				},
			},
		})
	}

	// Create and return the session
	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
		select: { id: true, expirationDate: true },
	})

	return session
}

/**
 * Create session for SSO authenticated user
 */
export async function loginWithSSO({
	user,
	_organizationId,
}: {
	user: User
	_organizationId: string
}) {
	const canLogin = await canUserLogin(user.id)
	if (!canLogin) {
		throw new Error('User is banned and cannot login')
	}

	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})

	return session
}

export async function logout(
	{
		request,
		redirectTo = '/',
	}: {
		request: Request
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)

	// Get userId before deleting session for audit logging
	let userId: string | undefined
	if (sessionId) {
		const session = await prisma.session.findUnique({
			where: { id: sessionId },
			select: { userId: true },
		})
		userId = session?.userId

		// Log logout event for SOC2 compliance
		if (userId) {
			await auditService.log({
				action: AuditAction.USER_LOGOUT,
				userId,
				details: 'User logged out',
				metadata: { sessionId },
				request,
				severity: 'info',
			})
		}

		// the .catch is important because that's what triggers the query.
		// learn more about PrismaPromise: https://www.prisma.io/docs/orm/reference/prisma-client-reference#prismapromise-behavior
		void prisma.session.deleteMany({ where: { id: sessionId } }).catch(() => {})
	}
	throw redirect(safeRedirect(redirectTo), {
		...responseInit,
		headers: combineHeaders(
			{ 'set-cookie': await authSessionStorage.destroySession(authSession) },
			responseInit?.headers,
		),
	})
}

export async function getPasswordHash(password: string) {
	// Using cost factor 12 for enhanced security (OWASP recommendation 2025)
	// This provides better protection against brute force attacks
	// while maintaining reasonable performance
	const hash = await bcrypt.hash(password, 12)
	return hash
}

export async function verifyUserPassword(
	where: Pick<User, 'username'> | Pick<User, 'id'> | Pick<User, 'email'>,
	password: Password['hash'],
) {
	const userWithPassword = await prisma.user.findUnique({
		where,
		select: { id: true, password: { select: { hash: true } } },
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	if (!isValid) {
		return null
	}

	return { id: userWithPassword.id }
}

export function getPasswordHashParts(password: string) {
	const hash = crypto
		.createHash('sha1')
		.update(password, 'utf8')
		.digest('hex')
		.toUpperCase()
	return [hash.slice(0, 5), hash.slice(5)] as const
}

export async function checkIsCommonPassword(password: string) {
	const [prefix, suffix] = getPasswordHashParts(password)

	try {
		const response = await fetch(
			`https://api.pwnedpasswords.com/range/${prefix}`,
			{ signal: AbortSignal.timeout(1000) },
		)

		if (!response.ok) return false

		const data = await response.text()
		return data.split(/\r?\n/).some((line) => {
			const [hashSuffix, ignored_prevalenceCount] = line.split(':')
			return hashSuffix === suffix
		})
	} catch (error) {
		if (error instanceof DOMException && error.name === 'TimeoutError') {
			console.warn('Password check timed out')
			return false
		}

		console.warn('Unknown error during password check', error)
		return false
	}
}
