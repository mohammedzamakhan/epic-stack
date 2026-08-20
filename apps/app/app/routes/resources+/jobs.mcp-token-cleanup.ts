import { db, lt, MCPAccessToken, MCPRefreshToken } from '@repo/database'
import { requireInternalCommandAuth } from '#app/utils/internal-command-auth.server.ts'
import { type Route } from './+types/jobs.mcp-token-cleanup.ts'

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 })
	}

	await requireInternalCommandAuth(request)

	const now = new Date()

	const expiredAccessTokens = await db
		.delete(MCPAccessToken)
		.where(lt(MCPAccessToken.expiresAt, now))

	const expiredRefreshTokens = await db
		.delete(MCPRefreshToken)
		.where(lt(MCPRefreshToken.expiresAt, now))

	return Response.json({
		success: true,
		accessTokensDeleted: expiredAccessTokens.rowsAffected,
		refreshTokensDeleted: expiredRefreshTokens.rowsAffected,
		totalDeleted:
			expiredAccessTokens.rowsAffected + expiredRefreshTokens.rowsAffected,
		timestamp: now.toISOString(),
	})
}
