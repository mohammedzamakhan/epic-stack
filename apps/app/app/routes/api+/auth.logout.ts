import { data } from 'react-router'
import { z } from 'zod'
import { revokeRefreshToken } from '#app/utils/jwt.server.ts'
import { type Route } from './+types/auth.logout.ts'

const LogoutSchema = z.object({
	refreshToken: z.string().optional(),
})

export async function action({ request }: Route.ActionArgs) {
	try {
		const body = await request.json()
		const result = LogoutSchema.safeParse(body)

		if (result.success && result.data.refreshToken) {
			// Revoke the refresh token
			await revokeRefreshToken(result.data.refreshToken)
		}

		return data({
			success: true,
			data: { message: 'Logged out successfully' },
		})
	} catch (error) {
		console.error('Logout error:', error)
		return data(
			{
				success: false,
				error: 'logout_failed',
				message: 'Failed to logout',
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
			message: 'Use POST method for logout',
		},
		{ status: 405 },
	)
}
