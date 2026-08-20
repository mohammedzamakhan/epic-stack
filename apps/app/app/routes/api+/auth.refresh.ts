import { getClientIp } from '@repo/common/ip-tracking'
import { db, eq, User, UserImage } from '@repo/database'
import { data } from 'react-router'
import { z } from 'zod'
import { canUserLogin } from '#app/utils/auth.server.ts'
import { rotateRefreshToken, createAccessToken } from '#app/utils/jwt.server.ts'
import { type Route } from './+types/auth.refresh.ts'

const RefreshSchema = z.object({
	refreshToken: z.string(),
	userId: z.string(),
})

export async function action({ request }: Route.ActionArgs) {
	try {
		const body = await request.json()
		const result = RefreshSchema.safeParse(body)

		if (!result.success) {
			return data(
				{
					success: false,
					error: 'invalid_request',
					message: 'Missing refreshToken or userId',
				},
				{ status: 400 },
			)
		}

		const { refreshToken, userId } = result.data

		// Verify user exists
		const [user] = await db
			.select({
				id: User.id,
				email: User.email,
				username: User.username,
				name: User.name,
				createdAt: User.createdAt,
				updatedAt: User.updatedAt,
			})
			.from(User)
			.where(eq(User.id, userId))
			.limit(1)
		const [image] = await db
			.select({ id: UserImage.id })
			.from(UserImage)
			.where(eq(UserImage.userId, userId))
			.limit(1)

		if (!user) {
			return data(
				{
					success: false,
					error: 'user_not_found',
					message: 'Invalid user',
				},
				{ status: 401 },
			)
		}

		// Verify user is allowed to log in (not banned)
		const canLogin = await canUserLogin(userId)
		if (!canLogin) {
			return data(
				{
					success: false,
					error: 'user_banned',
					message: 'User account is disabled or banned',
				},
				{ status: 401 },
			)
		}

		// Rotate refresh token and get new tokens
		const userAgent = request.headers.get('user-agent') ?? undefined
		const ip = getClientIp(request)

		const rotated = await rotateRefreshToken(refreshToken, userId, {
			userAgent,
			ip,
		})

		if (!rotated) {
			return data(
				{
					success: false,
					error: 'invalid_refresh_token',
					message: 'Invalid or expired refresh token',
				},
				{ status: 401 },
			)
		}

		// Create new access token
		const accessToken = createAccessToken({
			sub: user.id,
			email: user.email,
			username: user.username,
		})

		return data({
			success: true,
			data: {
				user: {
					id: user.id,
					email: user.email,
					username: user.username,
					name: user.name,
					image: image?.id,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
				},
				accessToken,
				refreshToken: rotated.token,
				expiresIn: 15 * 60, // 15 minutes in seconds
				expiresAt: rotated.expiresAt.toISOString(),
			},
		})
	} catch (error) {
		console.error('Refresh token error:', error)
		return data(
			{
				success: false,
				error: 'refresh_failed',
				message: 'Failed to refresh tokens',
			},
			{ status: 500 },
		)
	}
}

export async function loader() {
	return data(
		{
			success: false,
			error: 'method_not_allowed',
			message: 'Use POST method for refresh',
		},
		{ status: 405 },
	)
}
