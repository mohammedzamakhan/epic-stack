/**
 * Analytics Query Utilities
 *
 * Helper functions for querying the analytics database (PostgreSQL).
 * These utilities provide a clean API for accessing aggregated metrics,
 * historical data, and archived logs.
 *
 * Usage:
 * ```typescript
 * import { getOrganizationMetrics, getDailyTrends } from '@repo/prisma/analytics-queries'
 *
 * const metrics = await getOrganizationMetrics('org-123')
 * const trends = await getDailyTrends({ days: 30 })
 * ```
 */

import { analyticsDb } from './analytics-client.js'
import { logger } from '@repo/observability'

// ============================================================================
// ORGANIZATION METRICS
// ============================================================================

/**
 * Get metrics for a specific organization
 */
export async function getOrganizationMetrics(organizationId: string) {
  try {
    return await analyticsDb.organizationMetrics.findUnique({
      where: { organizationId },
    })
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get organization metrics')
    return null
  }
}

/**
 * Get metrics for all organizations, sorted by activity
 */
export async function getAllOrganizationMetrics(options?: {
  limit?: number
  sortBy?: 'totalUsers' | 'activeUsers30d' | 'totalNotes'
  planName?: string
  activeOnly?: boolean
}) {
  const { limit = 100, sortBy = 'activeUsers30d', planName, activeOnly = true } = options || {}

  try {
    return await analyticsDb.organizationMetrics.findMany({
      where: {
        ...(planName && { planName }),
        ...(activeOnly && { active: true }),
      },
      orderBy: { [sortBy]: 'desc' },
      take: limit,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get organization metrics')
    return []
  }
}

/**
 * Get top organizations by engagement/activity
 */
export async function getTopOrganizations(limit: number = 10) {
  try {
    return await analyticsDb.topOrganizations.findMany({
      orderBy: { activityScore: 'desc' },
      take: limit,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get top organizations')
    return []
  }
}

// ============================================================================
// USER METRICS
// ============================================================================

/**
 * Get metrics for a specific user
 */
export async function getUserMetrics(userId: string) {
  try {
    return await analyticsDb.userMetrics.findUnique({
      where: { userId },
    })
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get user metrics')
    return null
  }
}

/**
 * Get users by engagement score
 */
export async function getUsersByEngagement(options?: {
  minScore?: number
  limit?: number
  organizationId?: string
}) {
  const { minScore = 0, limit = 100, organizationId } = options || {}

  try {
    return await analyticsDb.userMetrics.findMany({
      where: {
        engagementScore: { gte: minScore },
        ...(organizationId && { primaryOrgId: organizationId }),
      },
      orderBy: { engagementScore: 'desc' },
      take: limit,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get users by engagement')
    return []
  }
}

/**
 * Get recently inactive users (churn risk)
 */
export async function getInactiveUsers(options?: {
  daysSinceLogin?: number
  limit?: number
}) {
  const { daysSinceLogin = 30, limit = 100 } = options || {}

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLogin)

    return await analyticsDb.userMetrics.findMany({
      where: {
        lastLoginAt: { lt: cutoffDate },
        engagementScore: { gt: 0 }, // Only users who were previously active
      },
      orderBy: { lastLoginAt: 'asc' },
      take: limit,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get inactive users')
    return []
  }
}

// ============================================================================
// DAILY & MONTHLY TRENDS
// ============================================================================

/**
 * Get daily metrics for a date range
 */
export async function getDailyTrends(options: {
  days?: number
  startDate?: Date
  endDate?: Date
  organizationId?: string | null
}) {
  const { days = 30, startDate, endDate, organizationId } = options

  try {
    const end = endDate || new Date()
    const start =
      startDate ||
      new Date(end.getTime() - days * 24 * 60 * 60 * 1000)

    return await analyticsDb.dailyMetrics.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        organizationId: organizationId !== undefined ? organizationId : null,
      },
      orderBy: { date: 'asc' },
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get daily trends')
    return []
  }
}

/**
 * Get monthly metrics for a date range
 */
export async function getMonthlyTrends(options: {
  months?: number
  organizationId?: string | null
}) {
  const { months = 12, organizationId } = options

  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1) // First day of month

    return await analyticsDb.monthlyMetrics.findMany({
      where: {
        month: {
          gte: startDate,
          lte: endDate,
        },
        organizationId: organizationId !== undefined ? organizationId : null,
      },
      orderBy: { month: 'asc' },
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get monthly trends')
    return []
  }
}

/**
 * Get user growth trend
 */
export async function getUserGrowthTrend(days: number = 90) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return await analyticsDb.userGrowthTrend.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get user growth trend')
    return []
  }
}

// ============================================================================
// REVENUE METRICS (for SaaS businesses)
// ============================================================================

/**
 * Get revenue metrics for a date range
 */
export async function getRevenueMetrics(months: number = 12) {
  try {
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)
    startDate.setDate(1)

    return await analyticsDb.revenueMetrics.findMany({
      where: {
        month: { gte: startDate },
      },
      orderBy: { month: 'asc' },
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get revenue metrics')
    return []
  }
}

/**
 * Get current MRR (Monthly Recurring Revenue)
 */
export async function getCurrentMRR() {
  try {
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const metrics = await analyticsDb.revenueMetrics.findUnique({
      where: { month: currentMonth },
    })

    return metrics?.totalMrr || 0
  } catch (error) {
    logger.error({ error }, 'Failed to get current MRR')
    return 0
  }
}

// ============================================================================
// ARCHIVED DATA QUERIES
// ============================================================================

/**
 * Search archived audit logs
 */
export async function searchArchivedAuditLogs(options: {
  organizationId?: string
  userId?: string
  action?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}) {
  const { organizationId, userId, action, startDate, endDate, limit = 100 } = options

  try {
    return await analyticsDb.archivedAuditLog.findMany({
      where: {
        ...(organizationId && { organizationId }),
        ...(userId && { userId }),
        ...(action && { action }),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to search archived audit logs')
    return []
  }
}

/**
 * Get audit log count by organization
 */
export async function getArchivedLogCount(organizationId: string) {
  try {
    return await analyticsDb.archivedAuditLog.count({
      where: { organizationId },
    })
  } catch (error) {
    logger.error({ error, organizationId }, 'Failed to get archived log count')
    return 0
  }
}

// ============================================================================
// SYNC STATUS
// ============================================================================

/**
 * Get sync job status for monitoring
 */
export async function getSyncJobStatus(jobType?: string) {
  try {
    return await analyticsDb.syncJob.findMany({
      where: jobType ? { jobType } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
  } catch (error) {
    logger.error({ error }, 'Failed to get sync job status')
    return []
  }
}

/**
 * Get last successful sync time for a table
 */
export async function getLastSyncTime(tableName: string) {
  try {
    const cursor = await analyticsDb.syncCursor.findUnique({
      where: { tableName },
    })

    return cursor?.lastSyncedAt || null
  } catch (error) {
    logger.error({ error, tableName }, 'Failed to get last sync time')
    return null
  }
}

/**
 * Get sync health summary
 */
export async function getSyncHealthSummary() {
  try {
    const recentJobs = await analyticsDb.syncJob.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const failedJobs = recentJobs.filter((j) => j.status === 'failed')
    const successfulJobs = recentJobs.filter((j) => j.status === 'completed')

    return {
      totalJobs: recentJobs.length,
      successfulJobs: successfulJobs.length,
      failedJobs: failedJobs.length,
      successRate:
        recentJobs.length > 0
          ? (successfulJobs.length / recentJobs.length) * 100
          : 100,
      recentFailures: failedJobs.slice(0, 5),
    }
  } catch (error) {
    logger.error({ error }, 'Failed to get sync health summary')
    return {
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      successRate: 0,
      recentFailures: [],
    }
  }
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * Get comprehensive dashboard data for an organization
 */
export async function getOrganizationDashboard(organizationId: string) {
  try {
    const [metrics, dailyTrends, monthlyTrends] = await Promise.all([
      getOrganizationMetrics(organizationId),
      getDailyTrends({ days: 30, organizationId }),
      getMonthlyTrends({ months: 12, organizationId }),
    ])

    return {
      currentMetrics: metrics,
      dailyTrends,
      monthlyTrends,
      lastUpdated: metrics?.lastSyncedAt || null,
    }
  } catch (error) {
    logger.error(
      { error, organizationId },
      'Failed to get organization dashboard'
    )
    return null
  }
}

/**
 * Get system-wide dashboard data
 */
export async function getSystemDashboard() {
  try {
    const [
      topOrgs,
      dailyTrends,
      userGrowth,
      revenueMetrics,
      syncHealth,
    ] = await Promise.all([
      getTopOrganizations(10),
      getDailyTrends({ days: 30, organizationId: null }),
      getUserGrowthTrend(90),
      getRevenueMetrics(12),
      getSyncHealthSummary(),
    ])

    return {
      topOrganizations: topOrgs,
      dailyTrends,
      userGrowth,
      revenueMetrics,
      syncHealth,
    }
  } catch (error) {
    logger.error({ error }, 'Failed to get system dashboard')
    return null
  }
}
