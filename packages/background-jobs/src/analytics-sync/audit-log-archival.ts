/**
 * Audit Log Archival Job
 *
 * This job archives old audit logs from SQLite to PostgreSQL and S3.
 * It helps keep the primary database lean while maintaining compliance
 * with data retention requirements.
 *
 * Strategy:
 * 1. Move logs older than retention period to PostgreSQL (ArchivedAuditLog)
 * 2. Export logs to S3 in compressed JSON format for cold storage
 * 3. Delete archived logs from SQLite
 *
 * Runs: Daily at 2 AM (configurable)
 */

import { task } from '@trigger.dev/sdk/v3'
import { prisma, analyticsDb } from '@repo/prisma'
import { logger } from '@repo/observability'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const archiveAuditLogs = task({
  id: 'analytics-archive-audit-logs',
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (
    payload: {
      retentionDays?: number
      batchSize?: number
      uploadToS3?: boolean
    },
    { ctx }
  ) => {
    const retentionDays = payload.retentionDays || 90 // Default: 90 days
    const batchSize = payload.batchSize || 1000
    const uploadToS3 = payload.uploadToS3 ?? true

    logger.info({ payload, retentionDays }, 'Starting audit log archival')

    try {
      // Create sync job record
      const syncJob = await analyticsDb.syncJob.create({
        data: {
          jobType: 'archive',
          tableName: 'AuditLog',
          status: 'running',
          startedAt: new Date(),
        },
      })

      // Calculate cutoff date
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      logger.info(
        { cutoffDate: cutoffDate.toISOString() },
        'Archiving logs older than cutoff date'
      )

      let processedCount = 0
      let archivedToPostgres = 0
      let archivedToS3 = 0
      let deletedFromSqlite = 0
      let failedCount = 0

      // Get organizations with specific retention policies
      const retentionPolicies =
        await prisma.auditLogRetentionPolicy.findMany()

      // Process system-wide logs and org-specific logs
      const organizationsToProcess = [
        null, // System logs
        ...retentionPolicies.map((p) => p.organizationId),
      ]

      for (const orgId of organizationsToProcess) {
        try {
          const policy = retentionPolicies.find(
            (p) => p.organizationId === orgId
          )
          const orgRetentionDays = policy?.retentionDays || retentionDays
          const orgCutoffDate = new Date()
          orgCutoffDate.setDate(orgCutoffDate.getDate() - orgRetentionDays)

          // Process in batches
          let hasMore = true
          let lastId: string | undefined

          while (hasMore) {
            // Fetch batch of old logs
            const logsToArchive = await prisma.auditLog.findMany({
              where: {
                organizationId: orgId,
                createdAt: { lt: orgCutoffDate },
                ...(lastId ? { id: { gt: lastId } } : {}),
              },
              orderBy: { id: 'asc' },
              take: batchSize,
            })

            if (logsToArchive.length === 0) {
              hasMore = false
              break
            }

            logger.info(
              {
                organizationId: orgId || 'system',
                batchSize: logsToArchive.length,
              },
              'Processing batch'
            )

            // Archive to PostgreSQL
            const postgresArchived = await archiveToPostgres(logsToArchive)
            archivedToPostgres += postgresArchived

            // Archive to S3 (optional)
            if (uploadToS3) {
              const s3Key = await archiveToS3(logsToArchive, orgId)
              if (s3Key) {
                archivedToS3 += logsToArchive.length
                // Update S3 key references in PostgreSQL
                await updateS3References(
                  logsToArchive.map((l) => l.id),
                  s3Key
                )
              }
            }

            // Delete from SQLite (only if successfully archived)
            if (postgresArchived === logsToArchive.length) {
              const deleteResult = await prisma.auditLog.deleteMany({
                where: {
                  id: { in: logsToArchive.map((l) => l.id) },
                },
              })
              deletedFromSqlite += deleteResult.count

              logger.info(
                {
                  deleted: deleteResult.count,
                  organizationId: orgId || 'system',
                },
                'Deleted archived logs from SQLite'
              )
            } else {
              logger.warn(
                {
                  expected: logsToArchive.length,
                  archived: postgresArchived,
                },
                'Partial archive - skipping deletion'
              )
              failedCount += logsToArchive.length - postgresArchived
            }

            processedCount += logsToArchive.length
            lastId = logsToArchive[logsToArchive.length - 1].id

            // Check if there are more logs
            if (logsToArchive.length < batchSize) {
              hasMore = false
            }
          }
        } catch (error) {
          logger.error(
            { error, organizationId: orgId },
            'Failed to archive logs for organization'
          )
          failedCount++
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
          metadata: {
            archivedToPostgres,
            archivedToS3,
            deletedFromSqlite,
          },
        },
      })

      logger.info(
        {
          processedCount,
          archivedToPostgres,
          archivedToS3,
          deletedFromSqlite,
          failedCount,
        },
        'Completed audit log archival'
      )

      return {
        success: true,
        processedCount,
        archivedToPostgres,
        archivedToS3,
        deletedFromSqlite,
        failedCount,
      }
    } catch (error) {
      logger.error({ error }, 'Audit log archival failed')
      throw error
    }
  },
})

/**
 * Archive logs to PostgreSQL
 */
async function archiveToPostgres(logs: any[]): Promise<number> {
  try {
    const archiveData = logs.map((log) => ({
      id: log.id,
      organizationId: log.organizationId,
      userId: log.userId,
      action: log.action,
      details: log.details,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      targetUserId: log.targetUserId,
      severity: log.severity,
      retainUntil: log.retainUntil,
      createdAt: log.createdAt,
      archivedAt: new Date(),
      archivedReason: 'retention_policy',
    }))

    // Batch insert to PostgreSQL
    await analyticsDb.archivedAuditLog.createMany({
      data: archiveData,
      skipDuplicates: true,
    })

    logger.info({ count: logs.length }, 'Archived logs to PostgreSQL')

    return logs.length
  } catch (error) {
    logger.error({ error }, 'Failed to archive to PostgreSQL')
    return 0
  }
}

/**
 * Archive logs to S3 in compressed JSON format
 */
async function archiveToS3(
  logs: any[],
  organizationId: string | null
): Promise<string | null> {
  try {
    const timestamp = new Date().toISOString().split('T')[0]
    const orgPath = organizationId || 'system'
    const s3Key = `audit-logs/${orgPath}/${timestamp}/${Date.now()}.json.gz`

    // Convert logs to JSON
    const jsonContent = JSON.stringify(logs, null, 2)

    // Compress with gzip
    const readable = Readable.from([jsonContent])
    const chunks: Buffer[] = []
    const gzip = createGzip()

    readable.pipe(gzip)

    for await (const chunk of gzip) {
      chunks.push(chunk as Buffer)
    }

    const compressedBuffer = Buffer.concat(chunks)

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key: s3Key,
        Body: compressedBuffer,
        ContentType: 'application/gzip',
        ContentEncoding: 'gzip',
        Metadata: {
          organizationId: organizationId || 'system',
          recordCount: logs.length.toString(),
          archivedAt: new Date().toISOString(),
        },
      })
    )

    logger.info(
      {
        s3Key,
        count: logs.length,
        size: compressedBuffer.length,
      },
      'Archived logs to S3'
    )

    return s3Key
  } catch (error) {
    logger.error({ error }, 'Failed to archive to S3')
    return null
  }
}

/**
 * Update S3 key references in PostgreSQL
 */
async function updateS3References(logIds: string[], s3Key: string) {
  try {
    await analyticsDb.archivedAuditLog.updateMany({
      where: { id: { in: logIds } },
      data: { s3Key },
    })

    logger.info(
      { count: logIds.length, s3Key },
      'Updated S3 references in PostgreSQL'
    )
  } catch (error) {
    logger.error({ error }, 'Failed to update S3 references')
  }
}

/**
 * Archive old integration logs
 */
export const archiveIntegrationLogs = task({
  id: 'analytics-archive-integration-logs',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { retentionDays?: number; batchSize?: number }) => {
    const retentionDays = payload.retentionDays || 30 // Keep for 30 days
    const batchSize = payload.batchSize || 1000

    logger.info({ retentionDays }, 'Starting integration log archival')

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

      let processedCount = 0
      let hasMore = true
      let lastId: string | undefined

      while (hasMore) {
        const logsToArchive = await prisma.integrationLog.findMany({
          where: {
            createdAt: { lt: cutoffDate },
            ...(lastId ? { id: { gt: lastId } } : {}),
          },
          include: {
            integration: {
              select: {
                organizationId: true,
              },
            },
          },
          orderBy: { id: 'asc' },
          take: batchSize,
        })

        if (logsToArchive.length === 0) {
          hasMore = false
          break
        }

        // Archive to PostgreSQL
        const archiveData = logsToArchive.map((log) => ({
          id: log.id,
          integrationId: log.integrationId,
          organizationId: log.integration.organizationId,
          action: log.action,
          status: log.status,
          requestData: log.requestData ? JSON.parse(log.requestData) : null,
          responseData: log.responseData ? JSON.parse(log.responseData) : null,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt,
          archivedAt: new Date(),
        }))

        await analyticsDb.archivedIntegrationLog.createMany({
          data: archiveData,
          skipDuplicates: true,
        })

        // Delete from SQLite
        await prisma.integrationLog.deleteMany({
          where: {
            id: { in: logsToArchive.map((l) => l.id) },
          },
        })

        processedCount += logsToArchive.length
        lastId = logsToArchive[logsToArchive.length - 1].id

        if (logsToArchive.length < batchSize) {
          hasMore = false
        }
      }

      logger.info(
        { processedCount },
        'Completed integration log archival'
      )

      return {
        success: true,
        processedCount,
      }
    } catch (error) {
      logger.error({ error }, 'Integration log archival failed')
      throw error
    }
  },
})
