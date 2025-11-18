/**
 * User Metrics Sync Job
 *
 * This job syncs user data from SQLite to PostgreSQL analytics database.
 * It calculates engagement metrics and activity patterns for each user.
 *
 * Runs: Every 6 hours (configurable)
 */

import { task } from '@trigger.dev/sdk/v3'
import { prisma, analyticsDb } from '@repo/prisma'
import { logger } from '@repo/observability'

export const syncUserMetrics = task({
  id: 'analytics-sync-user-metrics',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (
    payload: { userIds?: string[]; batchSize?: number },
    { ctx }
  ) => {
    const batchSize = payload.batchSize || 100
    let processedCount = 0
    let failedCount = 0

    logger.info({ payload }, 'Starting user metrics sync')

    try {
      // Create sync job record
      const syncJob = await analyticsDb.syncJob.create({
        data: {
          jobType: 'metrics',
          tableName: 'UserMetrics',
          status: 'running',
          startedAt: new Date(),
        },
      })

      // Get cursor for incremental sync
      const cursor = await analyticsDb.syncCursor.findUnique({
        where: { tableName: 'UserMetrics' },
      })

      // Build where clause
      const whereClause: any = {}
      if (payload.userIds) {
        whereClause.id = { in: payload.userIds }
      } else if (cursor?.lastTimestamp) {
        // Incremental sync: only users updated since last sync
        whereClause.updatedAt = { gte: cursor.lastTimestamp }
      }

      // Process in batches
      let skip = 0
      let hasMore = true

      while (hasMore) {
        const users = await prisma.user.findMany({
          where: whereClause,
          take: batchSize,
          skip,
          include: {
            sessions: {
              select: {
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            notes: {
              select: {
                id: true,
              },
            },
            noteComments: {
              select: {
                id: true,
              },
            },
            organizations: {
              select: {
                organizationId: true,
                isDefault: true,
              },
            },
          },
        })

        if (users.length === 0) {
          hasMore = false
          break
        }

        logger.info(
          { batchStart: skip, batchSize: users.length },
          'Processing user batch'
        )

        for (const user of users) {
          try {
            const now = new Date()
            const sevenDaysAgo = new Date(
              now.getTime() - 7 * 24 * 60 * 60 * 1000
            )
            const thirtyDaysAgo = new Date(
              now.getTime() - 30 * 24 * 60 * 60 * 1000
            )

            // Calculate login counts
            const totalLogins = user.sessions.length
            const loginCount7d = user.sessions.filter(
              (s) => s.createdAt >= sevenDaysAgo
            ).length
            const loginCount30d = user.sessions.filter(
              (s) => s.createdAt >= thirtyDaysAgo
            ).length

            const lastLoginAt =
              user.sessions.length > 0 ? user.sessions[0].createdAt : null

            // Calculate engagement score (0-100)
            // Factors: recency of login, login frequency, content creation
            let engagementScore = 0

            // Recency (0-40 points)
            if (lastLoginAt) {
              const daysSinceLogin =
                (now.getTime() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24)
              if (daysSinceLogin < 1) engagementScore += 40
              else if (daysSinceLogin < 7) engagementScore += 30
              else if (daysSinceLogin < 30) engagementScore += 20
              else engagementScore += 10
            }

            // Frequency (0-30 points)
            if (loginCount30d > 20) engagementScore += 30
            else if (loginCount30d > 10) engagementScore += 20
            else if (loginCount30d > 5) engagementScore += 10

            // Content creation (0-30 points)
            const contentScore = Math.min(
              30,
              user.notes.length * 2 + user.noteComments.length
            )
            engagementScore += contentScore

            // Get primary organization
            const primaryOrg = user.organizations.find((o) => o.isDefault)

            // Upsert user metrics
            await analyticsDb.userMetrics.upsert({
              where: { userId: user.id },
              create: {
                id: user.id,
                userId: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                createdAt: user.createdAt,
                totalLogins: totalLogins,
                lastLoginAt: lastLoginAt,
                loginCount7d: loginCount7d,
                loginCount30d: loginCount30d,
                notesCreated: user.notes.length,
                commentsCreated: user.noteComments.length,
                engagementScore: engagementScore,
                organizationCount: user.organizations.length,
                primaryOrgId: primaryOrg?.organizationId,
                lastSyncedAt: new Date(),
                calculatedAt: new Date(),
              },
              update: {
                email: user.email,
                username: user.username,
                name: user.name,
                totalLogins: totalLogins,
                lastLoginAt: lastLoginAt,
                loginCount7d: loginCount7d,
                loginCount30d: loginCount30d,
                notesCreated: user.notes.length,
                commentsCreated: user.noteComments.length,
                engagementScore: engagementScore,
                organizationCount: user.organizations.length,
                primaryOrgId: primaryOrg?.organizationId,
                lastSyncedAt: new Date(),
                calculatedAt: new Date(),
              },
            })

            processedCount++
          } catch (error) {
            failedCount++
            logger.error(
              { error, userId: user.id },
              'Failed to sync user metrics'
            )
          }
        }

        skip += batchSize

        // Check if there are more users to process
        if (users.length < batchSize) {
          hasMore = false
        }
      }

      // Update sync job status
      await analyticsDb.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: failedCount > 0 ? 'failed' : 'completed',
          completedAt: new Date(),
          recordsProcessed: processedCount,
          recordsFailed: failedCount,
        },
      })

      // Update sync cursor
      await analyticsDb.syncCursor.upsert({
        where: { tableName: 'UserMetrics' },
        create: {
          id: 'user-metrics-cursor',
          tableName: 'UserMetrics',
          lastSyncedAt: new Date(),
          lastTimestamp: new Date(),
          recordCount: processedCount,
        },
        update: {
          lastSyncedAt: new Date(),
          lastTimestamp: new Date(),
          recordCount: processedCount,
        },
      })

      logger.info(
        { processedCount, failedCount },
        'Completed user metrics sync'
      )

      return {
        success: true,
        processedCount,
        failedCount,
      }
    } catch (error) {
      logger.error({ error }, 'User metrics sync failed')
      throw error
    }
  },
})
