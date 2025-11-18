/**
 * Analytics Database Client (PostgreSQL)
 *
 * This is a separate Prisma client for the read-only analytics database.
 * It connects to PostgreSQL and provides access to aggregated metrics,
 * archived data, and materialized views.
 *
 * Usage:
 * ```typescript
 * import { analyticsDb } from '@repo/prisma/analytics-client'
 *
 * const metrics = await analyticsDb.organizationMetrics.findMany()
 * ```
 */

import { PrismaClient as AnalyticsPrismaClient } from '../generated/analytics'
import { logger } from '@repo/observability'

declare global {
  var __analyticsDb__: AnalyticsPrismaClient | undefined
}

// Singleton pattern for analytics database client
export const analyticsDb =
  global.__analyticsDb__ ??
  new AnalyticsPrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.__analyticsDb__ = analyticsDb
}

// Graceful shutdown
async function shutdown() {
  await analyticsDb.$disconnect()
}

process.on('beforeExit', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

/**
 * Check if analytics database is connected and healthy
 */
export async function isAnalyticsDbHealthy(): Promise<boolean> {
  try {
    await analyticsDb.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    logger.error({ error }, 'Analytics database health check failed')
    return false
  }
}

/**
 * Get analytics database connection info
 */
export function getAnalyticsDbInfo() {
  return {
    isConnected: analyticsDb ? true : false,
    provider: 'postgresql',
    purpose: 'read-only analytics and reporting',
  }
}
