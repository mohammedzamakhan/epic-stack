# Hybrid Database Implementation Guide

## Overview

This implementation adds a **hybrid database architecture** to the Epic Stack, combining SQLite for transactional workloads with PostgreSQL for analytics and reporting. This approach maintains the simplicity of SQLite while adding powerful analytics capabilities and efficient data archival.

## What's Been Implemented

### 1. PostgreSQL Analytics Database ✅

**File**: `packages/prisma/schema-analytics.prisma`

A complete PostgreSQL schema designed for analytics and reporting:

- **Aggregated Metrics Tables**:
  - `OrganizationMetrics` - Per-org analytics (users, notes, engagement, storage)
  - `UserMetrics` - Per-user analytics (activity, engagement scores)
  - `DailyMetrics` - Daily aggregated statistics
  - `MonthlyMetrics` - Monthly trends and revenue metrics

- **Archived Data Tables**:
  - `ArchivedAuditLog` - Old audit logs (90+ days)
  - `ArchivedSession` - Historical session data
  - `ArchivedIntegrationLog` - Old integration logs

- **Materialized Views**:
  - `TopOrganizations` - Most active organizations
  - `UserGrowthTrend` - User growth over time
  - `RevenueMetrics` - MRR, churn, expansion metrics

- **Sync Tracking**:
  - `SyncJob` - Track sync job execution and status
  - `SyncCursor` - Track incremental sync progress

### 2. Background Sync Jobs ✅

**Directory**: `packages/background-jobs/src/analytics-sync/`

Automated jobs to sync data from SQLite to PostgreSQL:

#### Organization Metrics Sync
**File**: `organization-metrics-sync.ts`
- **Frequency**: Every hour
- **Purpose**: Calculate and sync organization-level metrics
- **Metrics Tracked**:
  - Total users, active users (30d, 7d)
  - Notes created, total comments
  - Storage usage (bytes, images, videos)
  - Engagement scores
  - Last activity timestamp

#### User Metrics Sync
**File**: `user-metrics-sync.ts`
- **Frequency**: Every 6 hours
- **Purpose**: Calculate user engagement and activity patterns
- **Metrics Tracked**:
  - Login counts (7d, 30d, total)
  - Content creation (notes, comments)
  - Engagement score (0-100, based on recency + frequency + content)
  - Organization membership

#### Daily Metrics Sync
**File**: `daily-metrics-sync.ts`
- **Frequency**: Daily at midnight
- **Purpose**: Create daily snapshots for trend analysis
- **Metrics Tracked**:
  - New users, active users
  - Notes/comments created
  - Session counts
  - API calls, errors (if tracked)

#### Audit Log Archival
**File**: `audit-log-archival.ts`
- **Frequency**: Daily at 2 AM
- **Purpose**: Archive old logs to PostgreSQL and S3
- **Process**:
  1. Move logs older than 90 days to PostgreSQL
  2. Export to S3 as compressed JSON
  3. Delete from SQLite to free space
- **Configurable**: Retention period per organization

#### Integration Log Archival
**File**: `audit-log-archival.ts`
- **Frequency**: Daily at 3 AM
- **Purpose**: Archive old integration logs (30+ days)

### 3. Scheduled Job Configuration ✅

**File**: `packages/background-jobs/src/schedules/analytics-sync-schedules.ts`

Pre-configured cron schedules for all sync jobs:
- Hourly org metrics sync
- 6-hourly user metrics sync
- Daily metrics aggregation
- Daily archival jobs
- Weekly full sync (consistency check)
- Monthly backfill (gap filling)

### 4. Analytics Query Utilities ✅

**File**: `packages/prisma/src/analytics-queries.ts`

Easy-to-use helper functions for querying analytics data:

#### Organization Queries
```typescript
import { getOrganizationMetrics, getAllOrganizationMetrics, getTopOrganizations } from '@repo/prisma'

// Get specific org metrics
const metrics = await getOrganizationMetrics('org-123')

// Get all orgs sorted by activity
const orgs = await getAllOrganizationMetrics({ sortBy: 'activeUsers30d', limit: 100 })

// Get top 10 organizations
const top = await getTopOrganizations(10)
```

#### User Queries
```typescript
import { getUserMetrics, getUsersByEngagement, getInactiveUsers } from '@repo/prisma'

// Get user metrics
const user = await getUserMetrics('user-456')

// Get highly engaged users
const engaged = await getUsersByEngagement({ minScore: 70 })

// Get inactive users (churn risk)
const inactive = await getInactiveUsers({ daysSinceLogin: 30 })
```

#### Trend Analysis
```typescript
import { getDailyTrends, getMonthlyTrends, getUserGrowthTrend } from '@repo/prisma'

// Daily trends for last 30 days
const daily = await getDailyTrends({ days: 30, organizationId: 'org-123' })

// Monthly trends for last 12 months
const monthly = await getMonthlyTrends({ months: 12 })

// User growth trend
const growth = await getUserGrowthTrend(90)
```

#### Dashboard Data
```typescript
import { getOrganizationDashboard, getSystemDashboard } from '@repo/prisma'

// Complete org dashboard
const dashboard = await getOrganizationDashboard('org-123')

// System-wide admin dashboard
const systemDash = await getSystemDashboard()
```

#### Archive Searches
```typescript
import { searchArchivedAuditLogs } from '@repo/prisma'

// Search old audit logs
const logs = await searchArchivedAuditLogs({
  organizationId: 'org-123',
  action: 'user.login',
  startDate: new Date('2024-01-01'),
  limit: 1000,
})
```

### 5. Database Client ✅

**File**: `packages/prisma/src/analytics-client.ts`

Separate Prisma client for analytics database:
```typescript
import { analyticsDb, isAnalyticsDbHealthy } from '@repo/prisma'

// Query analytics database
const metrics = await analyticsDb.organizationMetrics.findMany()

// Health check
const healthy = await isAnalyticsDbHealthy()
```

### 6. Environment Configuration ✅

**Files Updated**:
- `apps/app/app/utils/env.server.ts` - Added `ANALYTICS_DATABASE_URL`
- `apps/app/.env.example` - Added example connection string
- `packages/prisma/package.json` - Added analytics scripts

**Configuration**:
```env
ANALYTICS_DATABASE_URL="postgresql://user:password@host:5432/analytics?schema=public"
```

### 7. Setup Script ✅

**File**: `scripts/setup-analytics-db.sh`

Automated setup script with two modes:

**Local Mode** (Default):
```bash
./scripts/setup-analytics-db.sh --local
```
- Creates PostgreSQL Docker container
- Runs migrations
- Updates .env file
- Verifies connection

**Production Mode**:
```bash
./scripts/setup-analytics-db.sh --production
```
- Uses existing PostgreSQL from env
- Runs migrations
- Verifies setup

### 8. Documentation ✅

**File**: `docs/hybrid-database-architecture.md`

Comprehensive documentation covering:
- Architecture overview with diagrams
- Why hybrid approach
- Setup instructions
- Usage examples
- Performance considerations
- Monitoring & maintenance
- Troubleshooting
- Cost estimation
- Migration path
- Best practices

## Quick Start

### 1. Setup PostgreSQL

**Option A: Local Development (Docker)**
```bash
./scripts/setup-analytics-db.sh --local
```

**Option B: Production/Cloud**
```bash
# Set your PostgreSQL connection string
echo 'ANALYTICS_DATABASE_URL="postgresql://user:password@host:5432/analytics"' >> apps/app/.env

# Run migrations
cd packages/prisma
npm run analytics:migrate:deploy
npm run analytics:generate
```

### 2. Start Background Jobs

```bash
# Start Trigger.dev
npm run trigger:dev
```

### 3. Trigger Initial Sync

From the Trigger.dev dashboard, manually trigger:
1. `analytics-sync-organization-metrics`
2. `analytics-sync-user-metrics`
3. `analytics-sync-daily-metrics`

Or wait for scheduled runs.

### 4. Query Analytics

```typescript
import { getOrganizationMetrics } from '@repo/prisma'

// In your route loader
export async function loader({ params }: LoaderFunctionArgs) {
  const metrics = await getOrganizationMetrics(params.orgId)

  return json({
    currentUsers: metrics?.totalUsers,
    activeUsers: metrics?.activeUsers30d,
    engagement: metrics?.avgNotesPerUser,
  })
}
```

## Package Scripts

### Analytics Database Management

```bash
# Generate Prisma client
npm run analytics:generate

# Push schema changes (dev)
npm run analytics:push

# Create migration
npm run analytics:migrate:dev

# Deploy migrations (production)
npm run analytics:migrate:deploy
```

### Full Setup

```bash
# Setup everything (SQLite + PostgreSQL)
npm run setup
```

## File Structure

```
epic-stack/
├── packages/
│   ├── prisma/
│   │   ├── schema.prisma                    # SQLite schema (primary)
│   │   ├── schema-analytics.prisma          # PostgreSQL schema (analytics)
│   │   ├── src/
│   │   │   ├── analytics-client.ts          # Analytics DB client
│   │   │   └── analytics-queries.ts         # Query utilities
│   │   ├── generated/
│   │   │   └── analytics/                   # Generated Prisma client
│   │   └── migrations-analytics/            # Analytics migrations
│   │
│   └── background-jobs/
│       └── src/
│           ├── analytics-sync/
│           │   ├── organization-metrics-sync.ts
│           │   ├── user-metrics-sync.ts
│           │   ├── daily-metrics-sync.ts
│           │   ├── audit-log-archival.ts
│           │   └── index.ts
│           └── schedules/
│               └── analytics-sync-schedules.ts
│
├── scripts/
│   └── setup-analytics-db.sh                # Setup automation
│
├── docs/
│   └── hybrid-database-architecture.md      # Comprehensive docs
│
└── HYBRID_DATABASE_IMPLEMENTATION.md        # This file
```

## Monitoring

### Health Check Endpoint

Add to your app:
```typescript
// apps/app/app/routes/api+/health.ts
import { json } from 'react-router'
import { isAnalyticsDbHealthy, getSyncHealthSummary } from '@repo/prisma'

export async function loader() {
  const [analyticsHealthy, syncHealth] = await Promise.all([
    isAnalyticsDbHealthy(),
    getSyncHealthSummary(),
  ])

  return json({
    analytics: {
      connected: analyticsHealthy,
      syncHealth: {
        successRate: syncHealth.successRate,
        recentFailures: syncHealth.failedJobs,
      },
    },
  })
}
```

### Alerts to Configure

Set up alerts for:
- ❌ Analytics DB connection failures
- ⚠️ Sync job failures (> 3 consecutive)
- ⚠️ Sync lag (> 6 hours behind)
- ⚠️ SQLite database size (> 5GB)
- ⚠️ Disk space warnings

## Performance

### Expected Performance

**SQLite (Transactions)**:
- Read: < 10ms
- Write: < 50ms
- No change from current setup

**PostgreSQL (Analytics)**:
- Simple queries: 10-100ms
- Aggregations: 100-500ms
- Complex joins: 500ms-2s
- Much faster than running on SQLite

**Sync Jobs**:
- Org metrics: ~1-5 minutes for 1000 orgs
- User metrics: ~5-15 minutes for 10,000 users
- Daily metrics: ~2-10 minutes
- Archival: ~10-30 minutes for 100,000 logs

### Optimization Tips

1. **Index Important Columns**:
   ```sql
   CREATE INDEX CONCURRENTLY idx_org_metrics_plan
     ON "OrganizationMetrics"(plan_name, active);
   ```

2. **Use Materialized Views**:
   ```sql
   CREATE MATERIALIZED VIEW popular_orgs AS
     SELECT * FROM "OrganizationMetrics"
     WHERE active = true
     ORDER BY "activeUsers30d" DESC
     LIMIT 100;
   ```

3. **Partition Large Tables**:
   ```sql
   -- For very large deployments
   CREATE TABLE archived_audit_log (
     -- ... columns ...
   ) PARTITION BY RANGE (created_at);
   ```

## Data Retention

### Default Retention Policies

| Data Type | SQLite Retention | PostgreSQL Retention | S3 Retention |
|-----------|-----------------|---------------------|--------------|
| Audit Logs | 90 days | 7 years | Unlimited |
| Integration Logs | 30 days | 1 year | N/A |
| Session Data | Active only | 1 year | N/A |
| Metrics | Real-time | Unlimited | N/A |

### Customizing Retention

Per-organization retention policies:
```typescript
await prisma.auditLogRetentionPolicy.create({
  data: {
    organizationId: 'org-123',
    retentionDays: 2555, // 7 years for compliance
    hotStorageDays: 365, // 1 year in PostgreSQL
    archiveEnabled: true,
    exportEnabled: true,
    complianceType: 'SOC2',
  },
})
```

## Cost Analysis

### SQLite vs Full PostgreSQL vs Hybrid

**Small App (< 1K users)**:
- SQLite Only: $0/month ✅ (Current)
- Full PostgreSQL: $25/month
- **Hybrid: $10/month** ⭐ (Recommended)

**Medium App (1K-10K users)**:
- SQLite Only: $0/month (but slow analytics)
- Full PostgreSQL: $100-200/month
- **Hybrid: $50/month** ⭐ (Recommended)

**Large App (> 10K users)**:
- SQLite Only: Not recommended
- Full PostgreSQL: $500-1000/month
- **Hybrid: $200-300/month** ⭐ (Recommended)

### Cost Breakdown (Medium App)

- PostgreSQL: $25-50/month
- S3 Storage: $5-10/month
- Data Transfer: $5-10/month
- **Total: ~$50/month**

Compare to: Full PostgreSQL migration would cost $100-200/month.

## Migration Path

### Current Stage: Hybrid Implementation ✅

What you have now:
- ✅ SQLite for all transactions
- ✅ PostgreSQL for analytics
- ✅ Automated sync jobs
- ✅ Archival to S3
- ✅ Query utilities

### Next Steps (Optional)

**Stage 1: Enhanced Analytics** (1-2 months)
- [ ] Add custom materialized views
- [ ] Build admin dashboard using analytics data
- [ ] Add predictive analytics (churn prediction)
- [ ] Real-time analytics dashboard

**Stage 2: Scale Optimization** (2-4 months)
- [ ] Implement table partitioning
- [ ] Add read replicas for PostgreSQL
- [ ] Optimize sync job performance
- [ ] Add caching layer (Redis)

**Stage 3: Full PostgreSQL** (4-6 months, if needed)
- [ ] Migrate transactional data to PostgreSQL
- [ ] Keep SQLite for local dev
- [ ] Implement connection pooling
- [ ] Multi-region setup

## Troubleshooting

### Common Issues

**1. Sync Jobs Not Running**
```bash
# Check Trigger.dev status
npm run trigger:logs

# Manually trigger sync
npm run trigger:run analytics-sync-organization-metrics
```

**2. Analytics DB Connection Errors**
```bash
# Test connection
node -e "require('./packages/prisma/src/analytics-client').isAnalyticsDbHealthy().then(console.log)"

# Check environment variable
echo $ANALYTICS_DATABASE_URL
```

**3. Data Out of Sync**
```bash
# Force full resync
npm run trigger:run analytics-sync-organization-metrics -- --full
```

**4. PostgreSQL Performance Issues**
```sql
-- Check slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Analyze table statistics
ANALYZE "OrganizationMetrics";
```

## Testing

### Test Analytics Queries

```typescript
// packages/prisma/src/__tests__/analytics-queries.test.ts
import { describe, it, expect } from 'vitest'
import { getOrganizationMetrics } from '../analytics-queries'

describe('Analytics Queries', () => {
  it('should fetch organization metrics', async () => {
    const metrics = await getOrganizationMetrics('test-org-id')
    expect(metrics).toBeDefined()
  })
})
```

### Test Sync Jobs

```typescript
// packages/background-jobs/src/__tests__/sync.test.ts
import { describe, it, expect } from 'vitest'
import { syncOrganizationMetrics } from '../analytics-sync'

describe('Sync Jobs', () => {
  it('should sync organization metrics', async () => {
    const result = await syncOrganizationMetrics.run({ organizationIds: ['test'] })
    expect(result.success).toBe(true)
  })
})
```

## Security Considerations

### Connection Security

- ✅ Use SSL for PostgreSQL connections in production
- ✅ Store credentials in environment variables
- ✅ Use connection pooling with max connections limit
- ✅ Implement read-only user for analytics queries

### Data Privacy

- ✅ Encrypt sensitive data at rest (S3 server-side encryption)
- ✅ Encrypt data in transit (SSL/TLS)
- ✅ Anonymize PII in archived logs if required
- ✅ Implement data deletion for GDPR compliance

### Access Control

- ✅ Separate database users for sync jobs vs queries
- ✅ Row-level security for multi-tenant isolation
- ✅ Audit who accesses archived data
- ✅ Implement IP allowlisting for production DB

## Support

### Resources

- 📚 [Full Documentation](docs/hybrid-database-architecture.md)
- 💬 [GitHub Discussions](https://github.com/epicweb-dev/epic-stack/discussions)
- 🐛 [Report Issues](https://github.com/epicweb-dev/epic-stack/issues)

### Getting Help

1. Check documentation first
2. Search GitHub Discussions
3. Create a new discussion with:
   - Your setup (local/production)
   - Error messages
   - What you've tried
   - Relevant logs

## Contributing

Contributions welcome! Areas for improvement:

- [ ] Add more pre-built analytics queries
- [ ] Build sample dashboard components
- [ ] Add streaming sync for real-time metrics
- [ ] Improve error handling and retries
- [ ] Add data quality checks
- [ ] Write more tests

## License

Same as Epic Stack - MIT License

---

**Implemented by**: Claude (Anthropic AI)
**Date**: November 2025
**Version**: 1.0.0
