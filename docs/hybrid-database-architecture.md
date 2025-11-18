# Hybrid Database Architecture

The Epic Stack uses a **hybrid database approach** to combine the simplicity of SQLite for transactional workloads with the power of PostgreSQL for analytics and reporting.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                                                               │
│  ┌──────────────────┐              ┌──────────────────┐     │
│  │  Write Operations│              │  Read Operations  │     │
│  │  (Transactions)  │              │   (Analytics)     │     │
│  └────────┬─────────┘              └─────────┬────────┘     │
│           │                                   │              │
└───────────┼───────────────────────────────────┼──────────────┘
            │                                   │
            │                                   │
    ┌───────▼────────┐                 ┌────────▼──────────┐
    │    SQLite      │◄────Sync────────│   PostgreSQL      │
    │   (Primary)    │    Jobs         │   (Analytics)     │
    │                │                 │                   │
    │ • Users        │                 │ • Metrics         │
    │ • Notes        │                 │ • Aggregations    │
    │ • Orgs         │                 │ • Trends          │
    │ • Audit Logs   │                 │ • Archived Logs   │
    └────────────────┘                 └───────────────────┘
            │                                   │
            │                                   │
            └──────────────┬────────────────────┘
                           │
                    ┌──────▼──────┐
                    │      S3      │
                    │  (Cold       │
                    │   Storage)   │
                    │              │
                    │ • Old Logs   │
                    │ • Backups    │
                    └──────────────┘
```

## Why Hybrid?

### SQLite Benefits (Transactional Database)
- ✅ **Simple**: No separate database server to manage
- ✅ **Fast**: Excellent for read-heavy workloads and writes
- ✅ **Cost-effective**: No database hosting costs
- ✅ **Easy Development**: File-based, works locally without setup
- ✅ **LiteFS Support**: Distributed SQLite for multi-region deployments

### PostgreSQL Benefits (Analytics Database)
- ✅ **Powerful Queries**: Complex aggregations and JOINs
- ✅ **Materialized Views**: Pre-calculated metrics for dashboards
- ✅ **Time-Series Data**: Excellent for trends and historical analysis
- ✅ **Scalable**: Handle billions of archived records
- ✅ **Industry Standard**: Familiar to most developers

### S3 Benefits (Cold Storage)
- ✅ **Cost-Effective**: Pennies per GB for long-term storage
- ✅ **Unlimited**: No storage limits
- ✅ **Compliance**: Meet data retention requirements
- ✅ **Compressed**: GZIP compression for smaller files

## Architecture Components

### 1. Primary Database (SQLite)
**Location**: `packages/prisma/schema.prisma`

**Purpose**: Handles all transactional operations
- User authentication and sessions
- Organization and member management
- Notes, comments, and uploads
- Recent audit logs (last 90 days)
- Integrations and configurations

**Configuration**:
```env
DATABASE_URL="file:./db/data.db?connection_limit=1"
```

### 2. Analytics Database (PostgreSQL)
**Location**: `packages/prisma/schema-analytics.prisma`

**Purpose**: Stores aggregated metrics and archived data
- Organization metrics (users, notes, engagement)
- User metrics (activity, engagement scores)
- Daily/monthly trends
- Revenue metrics
- Archived audit logs (older than 90 days)
- Materialized views for dashboards

**Configuration**:
```env
ANALYTICS_DATABASE_URL="postgresql://user:password@localhost:5432/analytics"
```

### 3. Sync Jobs (Background Workers)
**Location**: `packages/background-jobs/src/analytics-sync/`

**Jobs**:
1. **Organization Metrics Sync** - Every hour
   - Aggregates user counts, notes, engagement
   - Calculates storage usage
   - Updates activity scores

2. **User Metrics Sync** - Every 6 hours
   - Tracks login patterns
   - Calculates engagement scores
   - Identifies inactive users

3. **Daily Metrics Sync** - Daily at midnight
   - Aggregates daily statistics
   - Tracks trends over time
   - System-wide and per-org metrics

4. **Audit Log Archival** - Daily at 2 AM
   - Moves old logs to PostgreSQL
   - Exports to S3 (compressed JSON)
   - Deletes from SQLite

5. **Integration Log Archival** - Daily at 3 AM
   - Archives integration logs
   - Keeps last 30 days in SQLite

## Setup Instructions

### 1. Install PostgreSQL

**Local Development** (using Docker):
```bash
docker run --name epic-analytics \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=analytics \
  -p 5432:5432 \
  -d postgres:16-alpine
```

**Production** (Recommended providers):
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Supabase](https://supabase.com) - PostgreSQL with extras
- [Railway](https://railway.app) - Simple PostgreSQL hosting
- [AWS RDS](https://aws.amazon.com/rds/) - Managed PostgreSQL

### 2. Configure Environment Variables

Add to your `.env` file:
```env
# Analytics Database (PostgreSQL)
ANALYTICS_DATABASE_URL="postgresql://user:password@localhost:5432/analytics?schema=public"
```

### 3. Run Migrations

Generate the analytics database schema:
```bash
cd packages/prisma
npm run analytics:generate
npm run analytics:migrate:deploy
```

### 4. Initial Data Sync

Run the initial sync to populate the analytics database:
```bash
# From the root of the project
npm run trigger:dev

# Then trigger these jobs manually:
# - analytics-sync-organization-metrics
# - analytics-sync-user-metrics
# - analytics-sync-daily-metrics
```

Or use the Trigger.dev CLI:
```bash
npx trigger.dev@latest dev
```

### 5. Verify Setup

Check that the analytics database is working:
```typescript
import { isAnalyticsDbHealthy } from '@repo/prisma'

const healthy = await isAnalyticsDbHealthy()
console.log('Analytics DB:', healthy ? '✅ Connected' : '❌ Failed')
```

## Usage Examples

### Querying Analytics Data

```typescript
import {
  getOrganizationMetrics,
  getDailyTrends,
  getTopOrganizations,
  getUsersByEngagement,
} from '@repo/prisma'

// Get metrics for an organization
const metrics = await getOrganizationMetrics('org-123')
console.log('Total users:', metrics?.totalUsers)
console.log('Active (30d):', metrics?.activeUsers30d)

// Get daily trends
const trends = await getDailyTrends({ days: 30, organizationId: 'org-123' })
console.log('Daily active users:', trends.map(t => t.activeUsers))

// Get top organizations
const topOrgs = await getTopOrganizations(10)

// Get highly engaged users
const engagedUsers = await getUsersByEngagement({
  minScore: 70,
  limit: 100,
})
```

### Building Dashboards

```typescript
import { getOrganizationDashboard, getSystemDashboard } from '@repo/prisma'

// Organization dashboard
const orgDashboard = await getOrganizationDashboard('org-123')
// Returns: currentMetrics, dailyTrends, monthlyTrends

// System-wide dashboard
const systemDashboard = await getSystemDashboard()
// Returns: topOrganizations, dailyTrends, userGrowth, revenueMetrics
```

### Searching Archived Logs

```typescript
import { searchArchivedAuditLogs } from '@repo/prisma'

// Search archived audit logs
const logs = await searchArchivedAuditLogs({
  organizationId: 'org-123',
  action: 'user.login',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  limit: 1000,
})
```

### Monitoring Sync Health

```typescript
import { getSyncHealthSummary, getLastSyncTime } from '@repo/prisma'

// Check sync health
const health = await getSyncHealthSummary()
console.log('Success rate:', health.successRate + '%')
console.log('Recent failures:', health.recentFailures)

// Check last sync time
const lastSync = await getLastSyncTime('OrganizationMetrics')
console.log('Last synced:', lastSync)
```

## Data Flow

### Write Path (SQLite)
```typescript
// All writes go to SQLite
await prisma.user.create({
  data: {
    email: 'user@example.com',
    username: 'user',
  },
})

// Audit log created in SQLite
await prisma.auditLog.create({
  data: {
    action: 'user.created',
    details: 'New user registered',
    userId: user.id,
  },
})
```

### Read Path (Analytics)
```typescript
// Analytics queries go to PostgreSQL
const metrics = await analyticsDb.organizationMetrics.findUnique({
  where: { organizationId: 'org-123' },
})

// Archived logs queried from PostgreSQL
const oldLogs = await analyticsDb.archivedAuditLog.findMany({
  where: {
    createdAt: { gte: new Date('2023-01-01') },
  },
})
```

### Sync Flow
```
SQLite → Background Job → PostgreSQL → (Optional) S3
```

1. Background job queries SQLite
2. Calculates aggregated metrics
3. Upserts data in PostgreSQL
4. (For old logs) Exports to S3
5. (For old logs) Deletes from SQLite

## Performance Considerations

### SQLite Optimizations
- Keep only recent data (last 90 days of logs)
- Regular VACUUM operations
- Proper indexing for common queries
- Connection pooling with LiteFS

### PostgreSQL Optimizations
- Materialized views for dashboard queries
- Partitioning for time-series data
- Regular ANALYZE for query planner
- Connection pooling (PgBouncer)

### Sync Job Optimizations
- Batch processing (1000 records at a time)
- Incremental syncs using cursors
- Retry logic with exponential backoff
- Parallel processing for independent jobs

## Monitoring & Maintenance

### Health Checks

Add to your monitoring:
```typescript
// In your health check endpoint
const analyticsHealth = await isAnalyticsDbHealthy()
const syncHealth = await getSyncHealthSummary()

return {
  analytics: {
    healthy: analyticsHealth,
    lastSync: await getLastSyncTime('OrganizationMetrics'),
  },
  syncJobs: {
    successRate: syncHealth.successRate,
    recentFailures: syncHealth.failedJobs,
  },
}
```

### Alerts to Configure
- ⚠️ Sync job failures (> 3 consecutive failures)
- ⚠️ Sync lag (> 6 hours behind)
- ⚠️ Analytics DB connection errors
- ⚠️ Disk space warnings (SQLite growing too large)

### Regular Maintenance
```bash
# Monthly: Check sync health
npm run check-sync-health

# Quarterly: Verify data integrity
npm run verify-analytics-data

# Yearly: Review retention policies
npm run review-retention-policies
```

## Troubleshooting

### Issue: Sync jobs failing
```bash
# Check sync job logs
npm run trigger:logs

# Retry failed sync manually
npm run trigger:run analytics-sync-organization-metrics
```

### Issue: Analytics data out of sync
```bash
# Force full resync
npm run trigger:run analytics-sync-organization-metrics -- --full-sync

# Or backfill specific date range
npm run trigger:run analytics-sync-daily-metrics -- --backfill-days=30
```

### Issue: PostgreSQL slow queries
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_org_metrics_plan
  ON "OrganizationMetrics"(plan_name, active);
```

### Issue: SQLite database growing too large
```bash
# Check current size
ls -lh packages/prisma/db/data.db

# Run archival job manually
npm run trigger:run analytics-archive-audit-logs

# Vacuum SQLite
sqlite3 packages/prisma/db/data.db "VACUUM;"
```

## Cost Estimation

### Small Scale (< 1,000 users)
- **PostgreSQL**: $0-25/month (Neon free tier or Railway hobby)
- **S3 Storage**: $0-1/month
- **Total**: ~$25/month

### Medium Scale (1,000 - 10,000 users)
- **PostgreSQL**: $25-100/month (Managed PostgreSQL)
- **S3 Storage**: $1-10/month (depends on log volume)
- **Total**: ~$100/month

### Large Scale (> 10,000 users)
- **PostgreSQL**: $100-500/month (High-performance instance)
- **S3 Storage**: $10-50/month
- **Total**: ~$500/month

Compare to full PostgreSQL migration: Could be $500-2000/month for similar scale.

## Migration Path

### Stage 1: Add Analytics (Current Implementation)
- ✅ Keep SQLite for transactions
- ✅ Add PostgreSQL for analytics
- ✅ Archive old logs

### Stage 2: Enhance Analytics (Optional)
- Add more materialized views
- Implement real-time dashboards
- Add predictive analytics

### Stage 3: Full PostgreSQL Migration (If Needed)
- Migrate transactional data to PostgreSQL
- Keep SQLite for local development
- Use PostgreSQL for all production workloads

## Best Practices

1. **Always query analytics from PostgreSQL** - Don't run complex analytics on SQLite
2. **Monitor sync lag** - Alert if sync jobs fall behind
3. **Set appropriate retention** - Balance compliance with database size
4. **Use materialized views** - For frequently accessed dashboard data
5. **Compress archived data** - Save on S3 storage costs
6. **Test restore procedures** - Regularly verify you can restore from archives
7. **Document custom queries** - Save common analytics queries for reuse

## References

- [SQLite Documentation](https://sqlite.org/docs.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [LiteFS Documentation](https://fly.io/docs/litefs/)
- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

## Need Help?

- 💬 [GitHub Discussions](https://github.com/epicweb-dev/epic-stack/discussions)
- 📧 [Support Email](mailto:support@epicweb.dev)
- 📚 [Epic Web Tutorials](https://epicweb.dev)
