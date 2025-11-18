/**
 * Organization Metrics Sync Job
 *
 * This job syncs organization data from SQLite to PostgreSQL analytics database.
 * It calculates aggregated metrics for each organization and stores them in
 * the analytics database for fast querying.
 *
 * Runs: Every hour (configurable)
 */

import { task } from '@trigger.dev/sdk/v3'
import { prisma, analyticsDb } from '@repo/prisma'
import { logger } from '@repo/observability'

export const syncOrganizationMetrics = task({
  id: 'analytics-sync-organization-metrics',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { organizationIds?: string[] }, { ctx }) => {
    const startTime = Date.now()
    let processedCount = 0
    let failedCount = 0

    logger.info({ payload }, 'Starting organization metrics sync')

    try {
      // Create sync job record
      const syncJob = await analyticsDb.syncJob.create({
        data: {
          jobType: 'metrics',
          tableName: 'OrganizationMetrics',
          status: 'running',
          startedAt: new Date(),
        },
      })

      // Get organizations to sync (all or specific ones)
      const whereClause = payload.organizationIds
        ? { id: { in: payload.organizationIds } }
        : {}

      const organizations = await prisma.organization.findMany({
        where: whereClause,
        include: {
          users: {
            include: {
              user: {
                select: {
                  id: true,
                  createdAt: true,
                  sessions: {
                    select: {
                      createdAt: true,
                    },
                    orderBy: {
                      createdAt: 'desc',
                    },
                    take: 1,
                  },
                },
              },
            },
          },
          notes: {
            select: {
              id: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              users: true,
              notes: true,
            },
          },
        },
      })

      logger.info(
        { count: organizations.length },
        'Found organizations to sync'
      )

      // Process each organization
      for (const org of organizations) {
        try {
          const now = new Date()
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

          // Calculate active users (users with sessions in last 30/7 days)
          const activeUsers30d = org.users.filter(
            (u) =>
              u.user.sessions.length > 0 &&
              u.user.sessions[0].createdAt >= thirtyDaysAgo
          ).length

          const activeUsers7d = org.users.filter(
            (u) =>
              u.user.sessions.length > 0 &&
              u.user.sessions[0].createdAt >= sevenDaysAgo
          ).length

          // Calculate new users this month
          const newUsersThisMonth = org.users.filter(
            (u) => u.user.createdAt >= thisMonthStart
          ).length

          // Calculate notes created this month
          const notesCreatedThisMonth = org.notes.filter(
            (n) => n.createdAt >= thisMonthStart
          ).length

          // Get total comments count
          const commentsCount = await prisma.noteComment.count({
            where: {
              note: {
                organizationId: org.id,
              },
            },
          })

          // Calculate engagement metrics
          const totalUsers = org._count.users || 0
          const avgNotesPerUser =
            totalUsers > 0 ? org._count.notes / totalUsers : 0

          // Get storage usage
          const uploads = await prisma.organizationNoteUpload.findMany({
            where: {
              note: {
                organizationId: org.id,
              },
            },
            select: {
              fileSize: true,
            },
          })

          const storageUsedBytes = uploads.reduce(
            (sum, upload) => sum + (upload.fileSize || 0),
            0
          )

          const totalImages = await prisma.organizationNoteUpload.count({
            where: {
              note: { organizationId: org.id },
              type: 'image',
            },
          })

          const totalVideos = await prisma.organizationNoteUpload.count({
            where: {
              note: { organizationId: org.id },
              type: 'video',
            },
          })

          // Get last activity timestamp
          const lastActivity = await prisma.noteActivityLog.findFirst({
            where: {
              note: {
                organizationId: org.id,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              createdAt: true,
            },
          })

          // Upsert metrics in analytics database
          await analyticsDb.organizationMetrics.upsert({
            where: { organizationId: org.id },
            create: {
              id: org.id,
              organizationId: org.id,
              organizationName: org.name,
              organizationSlug: org.slug,
              planName: org.planName,
              active: org.active,
              createdAt: org.createdAt,
              totalUsers: totalUsers,
              activeUsers30d: activeUsers30d,
              activeUsers7d: activeUsers7d,
              newUsersThisMonth: newUsersThisMonth,
              totalNotes: org._count.notes,
              notesCreatedThisMonth: notesCreatedThisMonth,
              totalComments: commentsCount,
              avgNotesPerUser: avgNotesPerUser,
              avgLoginsPerDay: 0, // TODO: Calculate from session data
              lastActivityAt: lastActivity?.createdAt,
              storageUsedBytes: BigInt(storageUsedBytes),
              totalImages: totalImages,
              totalVideos: totalVideos,
              subscriptionStatus: org.subscriptionStatus,
              lastSyncedAt: new Date(),
              calculatedAt: new Date(),
            },
            update: {
              organizationName: org.name,
              organizationSlug: org.slug,
              planName: org.planName,
              active: org.active,
              totalUsers: totalUsers,
              activeUsers30d: activeUsers30d,
              activeUsers7d: activeUsers7d,
              newUsersThisMonth: newUsersThisMonth,
              totalNotes: org._count.notes,
              notesCreatedThisMonth: notesCreatedThisMonth,
              totalComments: commentsCount,
              avgNotesPerUser: avgNotesPerUser,
              lastActivityAt: lastActivity?.createdAt,
              storageUsedBytes: BigInt(storageUsedBytes),
              totalImages: totalImages,
              totalVideos: totalVideos,
              subscriptionStatus: org.subscriptionStatus,
              lastSyncedAt: new Date(),
              calculatedAt: new Date(),
            },
          })

          processedCount++

          logger.info(
            {
              organizationId: org.id,
              organizationName: org.name,
              metrics: {
                totalUsers,
                activeUsers30d,
                totalNotes: org._count.notes,
              },
            },
            'Synced organization metrics'
          )
        } catch (error) {
          failedCount++
          logger.error(
            { error, organizationId: org.id },
            'Failed to sync organization metrics'
          )
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
        where: { tableName: 'OrganizationMetrics' },
        create: {
          id: 'org-metrics-cursor',
          tableName: 'OrganizationMetrics',
          lastSyncedAt: new Date(),
          recordCount: processedCount,
        },
        update: {
          lastSyncedAt: new Date(),
          recordCount: processedCount,
        },
      })

      const duration = Date.now() - startTime

      logger.info(
        {
          processedCount,
          failedCount,
          duration,
        },
        'Completed organization metrics sync'
      )

      return {
        success: true,
        processedCount,
        failedCount,
        duration,
      }
    } catch (error) {
      logger.error({ error }, 'Organization metrics sync failed')
      throw error
    }
  },
})
