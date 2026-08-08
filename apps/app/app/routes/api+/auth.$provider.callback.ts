import {
	normalizeEmail,
	normalizeUsername,
	canUserLogin,
	ProviderNameSchema,
} from '@repo/auth'
import { prisma } from '@repo/database'
import { data } from 'react-router'
import { authenticator } from '#app/utils/auth.server.ts'
import { createAuthenticatedSessionResponse } from '#app/utils/jwt.server.ts'
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

	let authRequest = request
	const codeVerifier = url.searchParams.get('code_verifier')
	const state = url.searchParams.get('state')

	// If a mobile request sends a code_verifier, bypass cookie state validation 
	// by simulating the state cookie that remix-auth-oauth2 expects.
	if (codeVerifier && state) {
		const store = new URLSearchParams()
		store.set('state', state)
		store.set(state, codeVerifier)
		
		const fakeCookie = `oauth2:mobile=${store.toString()}`
		
		authRequest = new Request(request.url, {
			method: request.method,
			headers: new Headers(request.headers),
		})
		
		const existingCookie = authRequest.headers.get('Cookie')
		authRequest.headers.set(
			'Cookie',
			existingCookie ? `${existingCookie}; ${fakeCookie}` : fakeCookie,
		)
	}

	try {
		const authResult = await authenticator
			.authenticate(providerName, authRequest)
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
			request,
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
