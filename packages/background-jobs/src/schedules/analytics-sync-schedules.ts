/**
 * Analytics Sync Schedules
 *
 * Configures recurring schedules for analytics sync jobs.
 * Uses Trigger.dev's scheduling feature to run jobs at specified intervals.
 *
 * @see https://trigger.dev/docs/documentation/concepts/triggers/scheduled
 */

import { schedules } from '@trigger.dev/sdk/v3'
import {
  syncOrganizationMetrics,
  syncUserMetrics,
  syncDailyMetrics,
  archiveAuditLogs,
  archiveIntegrationLogs,
} from '../analytics-sync/index.js'

/**
 * Sync organization metrics every hour
 */
export const hourlyOrgMetricsSync = schedules.task({
  id: 'hourly-org-metrics-sync',
  cron: '0 * * * *', // Every hour at minute 0
  task: syncOrganizationMetrics,
  payload: {},
})

/**
 * Sync user metrics every 6 hours
 */
export const sixHourlyUserMetricsSync = schedules.task({
  id: 'six-hourly-user-metrics-sync',
  cron: '0 */6 * * *', // Every 6 hours
  task: syncUserMetrics,
  payload: { batchSize: 100 },
})

/**
 * Sync daily metrics at midnight
 */
export const dailyMetricsSync = schedules.task({
  id: 'daily-metrics-sync',
  cron: '0 0 * * *', // Every day at midnight
  task: syncDailyMetrics,
  payload: { backfillDays: 1 },
})

/**
 * Archive audit logs daily at 2 AM
 */
export const dailyAuditLogArchival = schedules.task({
  id: 'daily-audit-log-archival',
  cron: '0 2 * * *', // Every day at 2 AM
  task: archiveAuditLogs,
  payload: {
    retentionDays: 90,
    batchSize: 1000,
    uploadToS3: true,
  },
})

/**
 * Archive integration logs daily at 3 AM
 */
export const dailyIntegrationLogArchival = schedules.task({
  id: 'daily-integration-log-archival',
  cron: '0 3 * * *', // Every day at 3 AM
  task: archiveIntegrationLogs,
  payload: {
    retentionDays: 30,
    batchSize: 1000,
  },
})

/**
 * Weekly full sync (Sundays at 4 AM) - ensures consistency
 */
export const weeklyFullSync = schedules.task({
  id: 'weekly-full-sync',
  cron: '0 4 * * 0', // Every Sunday at 4 AM
  task: syncOrganizationMetrics,
  payload: {}, // Full sync of all organizations
})

/**
 * Monthly metrics backfill (1st of month at 5 AM)
 * Backfills the previous month's daily metrics in case of any gaps
 */
export const monthlyMetricsBackfill = schedules.task({
  id: 'monthly-metrics-backfill',
  cron: '0 5 1 * *', // 1st of every month at 5 AM
  task: syncDailyMetrics,
  payload: { backfillDays: 30 }, // Backfill last 30 days
})
