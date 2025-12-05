/**
 * Background job to clean up expired MCP tokens
 *
 * This job:
 * 1. Deletes expired access tokens (older than 1 hour)
 * 2. Deletes expired refresh tokens (older than 30 days)
 * 3. Logs cleanup operations for audit purposes
 *
 * Runs daily at 3 AM UTC via declarative cron schedule
 * Can also be triggered manually via: await mcpTokenCleanup.trigger()
 *
 * Requirements: 5.1, 5.2
 */

import { schedules, logger } from '@trigger.dev/sdk/v3'
import { prisma } from '@repo/database'

export const mcpTokenCleanup = schedules.task({
	id: 'mcp-token-cleanup',
	// Declarative cron schedule - syncs on deploy
	cron: '0 3 * * *', // Daily at 3 AM UTC
	run: async (_payload) => {
		logger.info('Starting MCP token cleanup job')

		try {
			const now = new Date()

			// Delete expired access tokens
			const expiredAccessTokens = await prisma.mCPAccessToken.deleteMany({
				where: {
					expiresAt: { lt: now },
				},
			})

			if (expiredAccessTokens.count > 0) {
				logger.info('Deleted expired access tokens', {
					count: expiredAccessTokens.count,
					timestamp: now.toISOString(),
				})
			}

			// Delete expired refresh tokens
			const expiredRefreshTokens = await prisma.mCPRefreshToken.deleteMany({
				where: {
					expiresAt: { lt: now },
				},
			})

			if (expiredRefreshTokens.count > 0) {
				logger.info('Deleted expired refresh tokens', {
					count: expiredRefreshTokens.count,
					timestamp: now.toISOString(),
				})
			}

			const totalDeleted =
				expiredAccessTokens.count + expiredRefreshTokens.count

			logger.info('MCP token cleanup completed successfully', {
				accessTokensDeleted: expiredAccessTokens.count,
				refreshTokensDeleted: expiredRefreshTokens.count,
				totalDeleted,
				timestamp: now.toISOString(),
			})

			return {
				success: true,
				accessTokensDeleted: expiredAccessTokens.count,
				refreshTokensDeleted: expiredRefreshTokens.count,
				totalDeleted,
				timestamp: now.toISOString(),
			}
		} catch (error) {
			logger.error('MCP token cleanup failed', {
				error: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString(),
			})

			// Re-throw to mark the job as failed in Trigger.dev
			throw error
		}
	},
})
