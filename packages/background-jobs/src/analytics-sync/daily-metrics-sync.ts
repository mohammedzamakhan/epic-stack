/**
 * Daily Metrics Aggregation Job
 *
 * This job calculates daily aggregated metrics from the SQLite database
 * and stores them in PostgreSQL for historical trend analysis.
 *
 * Runs: Daily at midnight (configurable)
 */

import { task } from '@trigger.dev/sdk/v3'
import { prisma, analyticsDb } from '@repo/prisma'
import { logger } from '@repo/observability'

export const syncDailyMetrics = task({
  id: 'analytics-sync-daily-metrics',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: { date?: string; backfillDays?: number }, { ctx }) => {
    logger.info({ payload }, 'Starting daily metrics sync')

    try {
      // Determine which date(s) to process
      const targetDate = payload.date ? new Date(payload.date) : new Date()
      const backfillDays = payload.backfillDays || 1

      const datesToProcess: Date[] = []
      for (let i = 0; i < backfillDays; i++) {
        const date = new Date(targetDate)
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        datesToProcess.push(date)
      }

      logger.info(
        { dates: datesToProcess.map((d) => d.toISOString()) },
        'Processing dates'
      )

      let processedCount = 0

      for (const date of datesToProcess) {
        const nextDay = new Date(date)
        nextDay.setDate(nextDay.getDate() + 1)

        // Calculate system-wide metrics
        await calculateDailyMetrics(null, date, nextDay)
        processedCount++

        // Calculate per-organization metrics
        const organizations = await prisma.organization.findMany({
          select: { id: true },
        })

        for (const org of organizations) {
          await calculateDailyMetrics(org.id, date, nextDay)
          processedCount++
        }
      }

      logger.info(
        { processedCount, dates: datesToProcess.length },
        'Completed daily metrics sync'
      )

      return {
        success: true,
        processedCount,
        datesProcessed: datesToProcess.length,
      }
    } catch (error) {
      logger.error({ error }, 'Daily metrics sync failed')
      throw error
    }
  },
})

/**
 * Calculate daily metrics for a specific date and organization
 */
async function calculateDailyMetrics(
  organizationId: string | null,
  startDate: Date,
  endDate: Date
) {
  const whereClause: any = {
    createdAt: {
      gte: startDate,
      lt: endDate,
    },
  }

  // New users created on this day
  const newUsers = await prisma.user.count({
    where: organizationId
      ? {
          ...whereClause,
          organizations: {
            some: { organizationId },
          },
        }
      : whereClause,
  })

  // Active users (users who had a session on this day)
  const activeUsersData = await prisma.session.findMany({
    where: organizationId
      ? {
          ...whereClause,
          user: {
            organizations: {
              some: { organizationId },
            },
          },
        }
      : whereClause,
    select: {
      userId: true,
    },
    distinct: ['userId'],
  })
  const activeUsers = activeUsersData.length

  // Notes created on this day
  const notesCreated = await prisma.organizationNote.count({
    where: organizationId
      ? {
          ...whereClause,
          organizationId,
        }
      : whereClause,
  })

  // Comments created on this day
  const commentsCreated = await prisma.noteComment.count({
    where: organizationId
      ? {
          ...whereClause,
          note: {
            organizationId,
          },
        }
      : whereClause,
  })

  // Total sessions created on this day
  const totalSessions = await prisma.session.count({
    where: organizationId
      ? {
          ...whereClause,
          user: {
            organizations: {
              some: { organizationId },
            },
          },
        }
      : whereClause,
  })

  // TODO: Calculate API calls if you track them
  const apiCalls = 0

  // TODO: Calculate avg response time from logs
  const avgResponseTime = 0

  // TODO: Calculate error count from error logs
  const errorCount = 0

  // TODO: Calculate avg session duration
  const avgSessionDuration = 0

  // Generate unique ID for this metric
  const metricId = organizationId
    ? `${startDate.toISOString().split('T')[0]}-${organizationId}`
    : `${startDate.toISOString().split('T')[0]}-system`

  // Upsert daily metrics
  await analyticsDb.dailyMetrics.upsert({
    where: {
      date_organizationId: {
        date: startDate,
        organizationId: organizationId,
      },
    },
    create: {
      id: metricId,
      date: startDate,
      organizationId,
      newUsers,
      activeUsers,
      notesCreated,
      commentsCreated,
      apiCalls,
      totalSessions,
      avgSessionDuration,
      avgResponseTime,
      errorCount,
      createdAt: new Date(),
    },
    update: {
      newUsers,
      activeUsers,
      notesCreated,
      commentsCreated,
      apiCalls,
      totalSessions,
      avgSessionDuration,
      avgResponseTime,
      errorCount,
    },
  })

  logger.info(
    {
      date: startDate.toISOString().split('T')[0],
      organizationId: organizationId || 'system',
      metrics: {
        newUsers,
        activeUsers,
        notesCreated,
        commentsCreated,
      },
    },
    'Calculated daily metrics'
  )
}
