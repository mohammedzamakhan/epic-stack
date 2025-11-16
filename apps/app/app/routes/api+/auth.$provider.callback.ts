import { data } from 'react-router'
import { authenticator, canUserLogin } from '#app/utils/auth.server.ts'
import { createTokenPair } from '#app/utils/jwt.server.ts'
import { ProviderNameSchema } from '#app/utils/connections.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	normalizeEmail,
	normalizeUsername,
} from '#app/utils/providers/provider.ts'
import { getClientIp } from '#app/utils/ip-tracking.server.ts'
import { type Route } from './+types/auth.$provider.callback.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)
	const url = new URL(request.url)
	const error = url.searchParams.get('error')

	if (error) {
		return data(
			{
				success: false,
				error: 'auth_failed',
				message: 'Authentication failed',
			},
			{ status: 400 },
		)
	}

	try {
		const authResult = await authenticator
			.authenticate(providerName, request)
			.then(
				(data) => ({ success: true, data }) as const,
				(error) => ({ success: false, error }) as const,
			)

		if (!authResult.success) {
			console.error('Auth failed:', authResult.error)
			return data(
				{
					success: false,
					error: 'auth_failed',
					message: 'Authentication failed',
				},
				{ status: 400 },
			)
		}

		const profile = authResult.data

		// Check if connection already exists
		const existingConnection = await prisma.connection.findUnique({
			select: { userId: true },
			where: {
				providerName_providerId: {
					providerName,
					providerId: String(profile.id),
				},
			},
		})

		if (existingConnection) {
			// Check if user can login (not banned)
			const allowed = await canUserLogin(existingConnection.userId)
			if (!allowed) {
				return data(
					{
						success: false,
						error: 'user_banned',
						message: 'User account is banned',
					},
					{ status: 403 },
				)
			}

			const user = await prisma.user.findUnique({
				select: {
					id: true,
					email: true,
					username: true,
					name: true,
					image: { select: { id: true } },
					createdAt: true,
					updatedAt: true,
				},
				where: { id: existingConnection.userId },
			})

			if (!user) {
				return data(
					{
						success: false,
						error: 'user_not_found',
						message: 'User not found',
					},
					{ status: 400 },
				)
			}

			// Create JWT tokens for mobile authentication
			const userAgent = request.headers.get('user-agent') ?? undefined
			const ip = getClientIp(request)

			const tokens = await createTokenPair(
				{
					id: user.id,
					email: user.email,
					username: user.username,
				},
				{ userAgent, ip },
			)

			return data({
				success: true,
				data: {
					user: {
						id: user.id,
						email: user.email,
						username: user.username,
						name: user.name,
						image: user.image?.id,
						createdAt: user.createdAt.toISOString(),
						updatedAt: user.updatedAt.toISOString(),
					},
					// Return JWT tokens instead of session
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					expiresIn: tokens.expiresIn,
					expiresAt: tokens.expiresAt.toISOString(),
				},
			})
		}

		// Check if user exists with same email
		const existingUser = await prisma.user.findUnique({
			select: { id: true },
			where: { email: normalizeEmail(profile.email) },
		})

		if (existingUser) {
			// Check if user can login (not banned)
			const allowed = await canUserLogin(existingUser.id)
			if (!allowed) {
				return data(
					{
						success: false,
						error: 'user_banned',
						message: 'User account is banned',
					},
					{ status: 403 },
				)
			}

			// Connect provider to existing user
			await prisma.connection.create({
				data: {
					providerName,
					providerId: String(profile.id),
					userId: existingUser.id,
				},
			})

			const user = await prisma.user.findUnique({
				select: {
					id: true,
					email: true,
					username: true,
					name: true,
					image: { select: { id: true } },
					createdAt: true,
					updatedAt: true,
				},
				where: { id: existingUser.id },
			})

			if (!user) {
				return data(
					{
						success: false,
						error: 'user_not_found',
						message: 'User not found',
					},
					{ status: 400 },
				)
			}

			// Create JWT tokens for mobile authentication
			const userAgent = request.headers.get('user-agent') ?? undefined
			const ip = getClientIp(request)

			const tokens = await createTokenPair(
				{
					id: user.id,
					email: user.email,
					username: user.username,
				},
				{ userAgent, ip },
			)

			return data({
				success: true,
				data: {
					user: {
						id: user.id,
						email: user.email,
						username: user.username,
						name: user.name,
						image: user.image?.id,
						createdAt: user.createdAt.toISOString(),
						updatedAt: user.updatedAt.toISOString(),
					},
					// Return JWT tokens instead of session
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					expiresIn: tokens.expiresIn,
					expiresAt: tokens.expiresAt.toISOString(),
				},
			})
		}

		// Create new user with provider connection
		const { signupWithConnection } = await import('#app/utils/auth.server.ts')

		// Generate unique username
		let username = normalizeUsername(
			profile.username || profile.email?.split('@')[0] || 'user',
		)

		// Ensure username is unique
		let uniqueUsername = username
		let counter = 1
		while (
			await prisma.user.findUnique({ where: { username: uniqueUsername } })
		) {
			uniqueUsername = `${username}${counter}`
			counter++
		}

		const session = await signupWithConnection({
			email: normalizeEmail(profile.email),
			username: uniqueUsername,
			name: profile.name || profile.username || 'User',
			providerId: String(profile.id),
			providerName,
			imageUrl: profile.imageUrl,
		})

		const user = await prisma.user.findUnique({
			select: {
				id: true,
				email: true,
				username: true,
				name: true,
				image: { select: { id: true } },
				createdAt: true,
				updatedAt: true,
			},
			where: { id: session.id },
		})

		if (!user) {
			return data(
				{
					success: false,
					error: 'user_creation_failed',
					message: 'Failed to create user',
				},
				{ status: 500 },
			)
		}

		// Create JWT tokens for mobile authentication
		const userAgent = request.headers.get('user-agent') ?? undefined
		const ip = getClientIp(request)

		const tokens = await createTokenPair(
			{
				id: user.id,
				email: user.email,
				username: user.username,
			},
			{ userAgent, ip },
		)

		return data({
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					username: user.username,
					name: user.name,
					image: user.image?.id,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
				},
				// Return JWT tokens instead of session
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				expiresIn: tokens.expiresIn,
				expiresAt: tokens.expiresAt.toISOString(),
			},
		})
	} catch (error) {
		console.error('OAuth callback error:', error)
		return data(
			{
				success: false,
				error: 'callback_failed',
				message: 'Failed to process authentication callback',
			},
			{ status: 500 },
		)
	}
}
