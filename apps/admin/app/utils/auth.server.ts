import crypto from 'node:crypto'
import { type Connection, type Password, type User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'
import { Authenticator } from 'remix-auth'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { providers } from './connections.server.ts'
import { prisma } from './db.server.ts'
import { combineHeaders, downloadFile } from './misc.tsx'
import { type ProviderUser } from './providers/provider.ts'
import { authSessionStorage } from './session.server.ts'
import { uploadProfileImage } from './storage.server.ts'
import { getUtmParams } from './utm.server.ts'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'

export const authenticator = new Authenticator<ProviderUser>()

for (const [providerName, provider] of Object.entries(providers)) {
	const strategy = provider.getAuthStrategy()
	if (strategy) {
		authenticator.use(strategy, providerName)
	}
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
		throw redirect('/login')
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
}: {
	username: User['username']
	password: string
}) {
	const user = await verifyUserPassword({ username }, password)
	if (!user) return null

	const canLogin = await canUserLogin(user.id)
	if (!canLogin) return null

	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
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
	// if this fails, we still need to delete the session from the user's browser
	// and it doesn't do any harm staying in the db anyway.
	if (sessionId) {
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
	where: Pick<User, 'username'> | Pick<User, 'id'>,
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
			const [hashSuffix, _ignoredPrevalenceCount] = line.split(':')
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
