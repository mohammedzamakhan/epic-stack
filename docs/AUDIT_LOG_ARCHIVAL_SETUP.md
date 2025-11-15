# Audit Log Archival Setup Guide

## Overview

Audit logs need to be periodically archived to maintain performance and comply with retention policies. This guide shows you how to set up automated archival.

## Option 1: Trigger.dev (Recommended)

### Setup

The task is already created at `packages/background-jobs/src/tasks/audit-log-archival.ts` with a declarative cron schedule that runs daily at 2 AM UTC.

**Deploy the task to Trigger.dev:**
```bash
npx trigger.dev@latest deploy
```

That's it! The schedule (`0 2 * * *` - daily at 2 AM UTC) is defined in code and will automatically sync when you deploy. No manual dashboard configuration needed.

The task uses Trigger.dev's declarative scheduling feature, which means:
- ✅ Schedule is version controlled
- ✅ Automatically syncs on deploy
- ✅ No manual dashboard setup required
- ✅ Can be modified by updating the `cron` property in code

### Manual Trigger

You can trigger archival manually:

**Via Trigger.dev Dashboard:**
- Go to the task page
- Click "Test Run"
- Optional payload: `{ "manual": true }`

**Via Code:**
```typescript
import { auditLogArchival } from '@repo/background-jobs/tasks/audit-log-archival'

// Trigger manually
await auditLogArchival.trigger({ manual: true })
```

**Via Admin UI:**
- Go to `/admin/organizations/{orgId}/audit-retention`
- Click "Run Archival" button

### Modifying the Schedule

To change when archival runs, edit the `cron` property in `packages/background-jobs/src/tasks/audit-log-archival.ts`:

```typescript
export const auditLogArchival = schedules.task({
  id: 'audit-log-archival',
  cron: '0 3 * * *', // Change to 3 AM instead of 2 AM
  run: async (payload) => {
    // ...
  }
})
```

Then redeploy:
```bash
npx trigger.dev@latest deploy
```

The new schedule will automatically sync.

### Monitoring

View job runs in your Trigger.dev dashboard:
- Success/failure status
- Number of logs archived
- Number of logs deleted
- Execution time
- Schedule history and next run time

## Option 2: Simple Cron Job (Alternative)

If you're not using Trigger.dev, set up a simple cron job:

### 1. Create the API endpoint

Create `apps/app/app/routes/api+/cron+/archive-audit-logs.ts`:

```typescript
import { json } from 'react-router'
import { auditService } from '#app/utils/audit.server.ts'
import { logger } from '#app/utils/logger.server.ts'

export async function action({ request }: { request: Request }) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    logger.info('Starting audit log archival via cron')

    const result = await auditService.archiveOldLogs()

    logger.info(
      { archived: result.archived, deleted: result.deleted },
      'Audit log archival completed'
    )

    return json({
      success: true,
      archived: result.archived,
      deleted: result.deleted,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error({ err: error }, 'Audit log archival failed')
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
```

### 2. Set environment variable

Add to `.env`:
```
CRON_SECRET=your-secret-key-here
```

### 3. Configure external cron service

Choose one of these services:

#### Using GitHub Actions

Create `.github/workflows/audit-log-archival.yml`:

```yaml
name: Audit Log Archival

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  archive-logs:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger archival
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-domain.com/api/cron/archive-audit-logs
```

#### Using Vercel Cron (if on Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/archive-audit-logs",
      "schedule": "0 2 * * *"
    }
  ]
}
```

#### Using EasyCron or Cron-job.org

1. Sign up for [EasyCron](https://www.easycron.com/) or [Cron-job.org](https://cron-job.org/)
2. Create a new cron job
3. URL: `https://your-domain.com/api/cron/archive-audit-logs`
4. Method: POST
5. Headers: `Authorization: Bearer YOUR_CRON_SECRET`
6. Schedule: Daily at 2 AM

## Option 3: Manual Archival

You can run archival manually from the admin UI:

1. Go to `/admin/organizations/{orgId}/audit-retention`
2. Click "Run Archival" button
3. View results in the UI

Or via script:

```typescript
import { auditService } from '#app/utils/audit.server.ts'

const result = await auditService.archiveOldLogs()
console.log(`Archived: ${result.archived}, Deleted: ${result.deleted}`)
```

## How It Works

The archival process:

1. **Finds all organizations** with retention policies
2. **Archives old logs** (older than `hotStorageDays`)
   - Marks logs as `archived = true`
   - These logs remain in database but flagged as cold storage
3. **Deletes expired logs** (past `retainUntil` date)
   - Permanently removes logs that exceeded retention period
4. **Handles system logs** (no organization)
   - Archives after 180 days
   - Deletes after 1 year

## Performance Considerations

### Expected Performance

For a database with:
- **100,000 audit logs**
- **10 organizations**

Archival takes approximately:
- **5-15 seconds** total
- **~100ms per organization**
- **Database load: Low** (simple UPDATE/DELETE queries)

### Scaling

For very large databases (1M+ logs):
- Consider batching (process 10k logs at a time)
- Run during low-traffic hours (2 AM recommended)
- Monitor database performance

### Optimization

If archival is slow, consider:

1. **Batch processing** - Modify `archiveOldLogs()` to process in chunks
2. **Database indexes** - Already optimized with proper indexes
3. **Separate database** - Move archived logs to separate database
4. **Cloud storage** - Export archived logs to S3/GCS

## Monitoring

### Logs to Watch

The archival job logs:
```
INFO: Starting audit log archival
INFO: Archived 1,234 logs, deleted 567 expired logs
```

Or on error:
```
ERROR: Audit log archival failed: [error message]
```

### Metrics to Track

- **Archived count** - Should be consistent day-to-day
- **Deleted count** - Should be low (only expired logs)
- **Execution time** - Should be stable
- **Error rate** - Should be 0%

### Alerts

Set up alerts for:
- ❌ Archival job failures
- ❌ Execution time > 60 seconds (indicates scaling issues)
- ❌ No runs in 25+ hours (job not running)

## Testing

### Test in Development

1. Create some test audit logs
2. Set a short retention period (e.g., 1 day)
3. Run archival manually:
   ```typescript
   const result = await auditService.archiveOldLogs()
   console.log(result)
   ```
4. Verify logs are archived/deleted

### Test in Staging

1. Set up the cron job
2. Wait for scheduled run (or trigger manually)
3. Check logs for success
4. Verify archived logs are marked correctly
5. Verify deleted logs are gone

## Troubleshooting

### Job not running

**Check:**
- ✓ Cron secret is set correctly
- ✓ Job is enabled in Trigger.dev/GitHub Actions
- ✓ URL is correct and accessible
- ✓ No firewall blocking requests

### No logs archived

**Possible reasons:**
- No logs older than `hotStorageDays`
- Archival disabled in retention policy
- No retention policies configured

**Fix:**
- Check retention policies: `/admin/organizations/{id}/audit-retention`
- Verify `archiveEnabled = true`
- Check log ages vs. `hotStorageDays`

### Performance issues

**If archival is slow:**
- Check database query performance
- Review indexes (should already be optimized)
- Consider batching for very large datasets
- Run ANALYZE on audit log table

## Best Practices

1. **Run daily** - Don't let logs accumulate
2. **Monitor job health** - Set up alerts for failures
3. **Test in staging first** - Before enabling in production
4. **Review retention policies** - Ensure they match compliance needs
5. **Export before archival** - For compliance, export logs before they're deleted
6. **Keep job simple** - Don't add complex logic to archival job
7. **Use proper error handling** - Job should fail gracefully
8. **Log all actions** - Track what was archived/deleted

## Summary

✅ **Recommended Setup:** Trigger.dev with daily 2 AM schedule
✅ **Backup Option:** API endpoint + GitHub Actions/Vercel Cron
✅ **Manual Option:** Admin UI button for on-demand archival

Choose the option that best fits your infrastructure!

---

**Files:**
- Job implementation: `packages/background-jobs/src/tasks/audit-log-archival.ts`
- Archival logic: `apps/app/app/utils/audit.server.ts` (archiveOldLogs method)
- Admin UI: `apps/admin/app/routes/_admin+/organizations+/$organizationId_+/audit-retention.tsx`
- Configuration: `trigger.config.ts`
