import crypto from 'node:crypto'
import { type Password, type User } from '@prisma/client'
import { combineHeaders } from '@repo/common'
import { prisma } from '@repo/database'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { authSessionStorage } from './session.server.js'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'

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
		const now = new Date()
		const banExpired =
			session.user.banExpiresAt && new Date(session.user.banExpiresAt) <= now

		if (banExpired) {
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
	if (sessionId) {
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
			const [hashSuffix] = line.split(':')
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
