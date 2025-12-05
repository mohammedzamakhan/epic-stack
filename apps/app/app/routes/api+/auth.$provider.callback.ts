import { prisma } from '@repo/database'
import { data } from 'react-router'
import { authenticator, canUserLogin } from '#app/utils/auth.server.ts'
import { ProviderNameSchema } from '#app/utils/connections.tsx'
import { createAuthenticatedSessionResponse } from '#app/utils/jwt.server.ts'
import {
	normalizeEmail,
	normalizeUsername,
} from '#app/utils/providers/provider.ts'
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

			// Use shared helper to create authenticated session response
			const response = await createAuthenticatedSessionResponse(
				existingConnection.userId,
				request,
			)

			if (!response.success) {
				return data(response, { status: 400 })
			}

			return data(response)
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

			// Use shared helper to create authenticated session response
			const response = await createAuthenticatedSessionResponse(
				existingUser.id,
				request,
			)

			if (!response.success) {
				return data(response, { status: 400 })
			}

			return data(response)
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

		// Use shared helper to create authenticated session response
		const response = await createAuthenticatedSessionResponse(
			session.id,
			request,
		)

		if (!response.success) {
			return data(response, { status: 500 })
		}

		return data(response)
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
