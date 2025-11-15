# Enterprise Audit Logging Guide

## Overview

This guide documents the enterprise-grade audit logging system implemented in the Epic Stack application. The system provides comprehensive activity tracking, compliance support, and security monitoring.

## Features

### ✅ Comprehensive Event Coverage
- **130+ pre-defined audit actions** covering:
  - Authentication & authorization
  - User management
  - Organization operations
  - Data operations (notes, files, etc.)
  - API & security events
  - Admin operations
  - Subscriptions & billing
  - SSO operations
  - System events
  - Privacy & compliance (GDPR, data exports)

### ✅ Compliance Support
- **Retention policies** with compliance presets:
  - SOC2: 1 year retention
  - HIPAA: 6 years retention
  - SOX: 7 years retention
  - PCI DSS: 1 year retention
  - GDPR: 1 year retention
  - ISO 27001: 2 years retention

### ✅ Data Security
- **Automatic sanitization** of sensitive data (passwords, tokens, secrets)
- **IP address privacy** (partial masking)
- **Log injection prevention**
- **Immutability support** (logs cannot be modified after creation)

### ✅ Enterprise Features
- **CSV/JSON export** for compliance audits
- **Advanced filtering** by date, user, action, organization
- **Hot/cold storage** archiving
- **Real-time structured logging** (Pino + Sentry)
- **Audit statistics** and dashboards
- **Resource tracking** (track which resources were affected)

## Architecture

### Database Schema

```prisma
model AuditLog {
  id             String        @id
  organizationId String?       // Multi-tenant support
  userId         String?       // Actor
  action         String        // What happened
  details        String        // Human-readable description
  metadata       String?       // JSON with additional context
  ipAddress      String?       // Security tracking
  userAgent      String?       // Device/browser info
  resourceType   String?       // Type of resource affected
  resourceId     String?       // ID of resource affected
  targetUserId   String?       // For user management actions
  severity       String        // info, warning, error, critical
  retainUntil    DateTime?     // Compliance-aware retention
  archived       Boolean       // Hot/cold storage flag
  createdAt      DateTime      // Immutable timestamp
}

model AuditLogRetentionPolicy {
  id               String       @id
  organizationId   String       @unique
  retentionDays    Int          // How long to keep logs
  hotStorageDays   Int          // How long in searchable storage
  archiveEnabled   Boolean      // Enable auto-archiving
  exportEnabled    Boolean      // Allow exports
  complianceType   String?      // SOC2, HIPAA, etc.
  immutable        Boolean      // Prevent modifications
}
```

### Service Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (Routes, Services, Controllers)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 AuditService                             │
│  - log()                                                │
│  - logAuth()                                            │
│  - logUserManagement()                                  │
│  - logDataOperation()                                   │
│  - logSecurityEvent()                                   │
│  - logAdminOperation()                                  │
│  - query()                                              │
│  - exportCSV()                                          │
│  - exportJSON()                                         │
└────────────┬────────────────────────────────────────────┘
             │
             ├─────────────────┬──────────────────┐
             ▼                 ▼                  ▼
    ┌────────────────┐  ┌──────────┐    ┌──────────────┐
    │   Database     │  │  Logger  │    │  SIEM        │
    │  (Prisma)      │  │  (Pino)  │    │  (Optional)  │
    └────────────────┘  └──────────┘    └──────────────┘
```

## Quick Start

### 1. Apply Database Migration

```bash
cd packages/prisma
npx prisma migrate deploy
```

### 2. Basic Usage Example

```typescript
import { auditService, AuditAction } from '#app/utils/audit.server.ts'

// In your route action/loader:
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const userId = await getUserId(request)

  // Perform your operation
  const note = await prisma.note.create({
    data: {
      title: formData.get('title'),
      content: formData.get('content'),
      ownerId: userId,
    },
  })

  // Log the audit event
  await auditService.logDataOperation(
    AuditAction.NOTE_CREATED,
    userId,
    note.organizationId,
    'note',
    note.id,
    `Note created: ${note.title}`,
    { noteTitle: note.title },
    request,
  )

  return redirect(`/notes/${note.id}`)
}
```

## Integration Guide

### Step 1: Import the Service

```typescript
import { auditService, AuditAction } from '#app/utils/audit.server.ts'
```

### Step 2: Choose the Right Method

The `AuditService` provides convenience methods for different event types:

| Method | Use Case | Example |
|--------|----------|---------|
| `log()` | Generic events | Any audit event |
| `logAuth()` | Authentication events | Login, logout, password reset |
| `logUserManagement()` | User admin actions | Role changes, user bans |
| `logDataOperation()` | CRUD operations | Note created, file deleted |
| `logSecurityEvent()` | Security events | Suspicious activity, rate limits |
| `logAdminOperation()` | Admin actions | Impersonation, config changes |

### Step 3: Add Audit Logging

**✅ DO:**
- Log AFTER the operation succeeds
- Include relevant metadata
- Use the Request object for IP tracking
- Set appropriate severity levels
- Use meaningful, human-readable details

**❌ DON'T:**
- Log before the operation (in case it fails)
- Include sensitive data in metadata (it's auto-sanitized, but avoid it)
- Fail the primary operation if audit logging fails (it's caught)
- Log excessively (focus on security-relevant and compliance-required events)

## Common Patterns

### Pattern 1: User Authentication

```typescript
// Login success
await auditService.logAuth(
  AuditAction.USER_LOGIN,
  user.id,
  `User logged in: ${user.email}`,
  { loginMethod: 'password', remember: true },
  request,
  true, // success
)

// Login failure
await auditService.logAuth(
  AuditAction.USER_LOGIN_FAILED,
  undefined, // No user ID for failed logins
  `Failed login attempt for: ${email}`,
  { email, reason: 'Invalid password' },
  request,
  false, // failed
)
```

### Pattern 2: User Management

```typescript
// Admin changing user role
await auditService.logUserManagement(
  AuditAction.ORG_MEMBER_ROLE_CHANGED,
  adminUserId,           // Who did it
  targetUserId,          // Who was affected
  organizationId,        // Context
  `Role changed from ${oldRole} to ${newRole}`,
  { oldRole, newRole },
  request,
)
```

### Pattern 3: Data Operations

```typescript
// Note deletion
await auditService.logDataOperation(
  AuditAction.NOTE_DELETED,
  userId,
  organizationId,
  'note',                // Resource type
  noteId,                // Resource ID
  `Note deleted: ${note.title}`,
  { noteTitle: note.title, deletedBy: user.email },
  request,
)
```

### Pattern 4: Security Events

```typescript
// Suspicious activity detected
await auditService.logSecurityEvent(
  AuditAction.SUSPICIOUS_ACTIVITY_DETECTED,
  `Multiple failed login attempts from same IP`,
  {
    failedAttempts: 5,
    ipAddress: clientIP,
    timeWindow: '5 minutes',
  },
  request,
  'error', // Severity
)
```

## Retention Policies

### Setting Up Retention for an Organization

```typescript
// Apply SOC2 compliance preset
await auditService.updateRetentionPolicy(organizationId, {
  retentionDays: 365,
  hotStorageDays: 180,
  complianceType: 'SOC2',
  archiveEnabled: true,
  exportEnabled: true,
})

// Or use compliance preset
const preset = AuditService.getCompliancePresets().SOC2
await auditService.updateRetentionPolicy(organizationId, preset)
```

### Archival Job (Scheduled Task)

Run this as a cron job or scheduled task:

```typescript
// In your cron job:
const result = await auditService.archiveOldLogs()
console.log(`Archived ${result.archived} logs, deleted ${result.deleted} expired logs`)
```

## Exporting Audit Logs

### Admin UI Export

Users can export audit logs from the Admin UI:
- Navigate to `/admin/audit-logs`
- Click "Export CSV" or "Export JSON"
- Apply filters as needed
- Download starts automatically

### Programmatic Export

```typescript
// Export as CSV
const csv = await auditService.exportCSV({
  organizationId: 'org_123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
})

// Export as JSON
const json = await auditService.exportJSON({
  userId: 'user_123',
  actions: [AuditAction.USER_LOGIN, AuditAction.USER_LOGOUT],
})
```

## Querying Audit Logs

```typescript
const result = await auditService.query({
  organizationId: 'org_123',
  userId: 'user_456',
  actions: [AuditAction.NOTE_CREATED, AuditAction.NOTE_UPDATED],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  search: 'important',
  limit: 100,
  offset: 0,
})

console.log(result.logs)        // Array of audit log entries
console.log(result.total)       // Total count
console.log(result.page)        // Current page
console.log(result.totalPages)  // Total pages
```

## Audit Statistics

```typescript
const stats = await auditService.getStatistics({
  organizationId: 'org_123',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
})

console.log(stats.totalEvents)          // Total events
console.log(stats.topActions)           // Most common actions
console.log(stats.topUsers)             // Most active users
console.log(stats.recentSecurityEvents) // Recent security events
```

## Migration from Old System

### Old SSO Audit Logging

The old SSO-specific audit logging in `sso-audit-logging.server.ts` still works but should be gradually replaced:

```typescript
// OLD (still works)
import { ssoAuditLogger, SSOAuditEventType } from './sso-audit-logging.server.ts'
await ssoAuditLogger.logAuthenticationEvent(...)

// NEW (preferred)
import { auditService, AuditAction } from './audit.server.ts'
await auditService.logAuth(AuditAction.SSO_LOGIN, ...)
```

### Old Admin Audit Logs

The old admin audit logs in `NoteActivityLog` for impersonation should be migrated:

```typescript
// OLD
await prisma.noteActivityLog.create({
  data: {
    action: 'ADMIN_IMPERSONATION_START',
    noteId: someNoteId,
    ...
  },
})

// NEW
await auditService.logAdminOperation(
  AuditAction.ADMIN_IMPERSONATION_START,
  adminUserId,
  `Started impersonating user: ${targetUser.email}`,
  { targetUserId, targetUserEmail },
  request,
)
```

## Compliance Checklist

Use this checklist to ensure your audit logging meets compliance requirements:

### SOC2 Type II
- [ ] All user actions are logged
- [ ] All configuration changes are logged
- [ ] All data access is logged
- [ ] Retention policy set to minimum 1 year
- [ ] Logs are immutable (cannot be modified)
- [ ] Regular exports for external auditors
- [ ] Security events are monitored

### HIPAA
- [ ] All PHI access is logged
- [ ] User authentication events logged
- [ ] Data exports/deletions logged
- [ ] Retention policy set to 6 years
- [ ] Access to audit logs is restricted
- [ ] IP addresses and user agents captured

### GDPR
- [ ] Data export requests logged
- [ ] Data deletion requests logged
- [ ] User consent changes logged
- [ ] Access to personal data logged
- [ ] Data breach detection enabled
- [ ] Right to access audit logs

### PCI DSS
- [ ] All cardholder data access logged
- [ ] Authentication events logged
- [ ] Failed access attempts logged
- [ ] Retention policy set to minimum 1 year
- [ ] Daily log reviews (automated)
- [ ] Log tampering prevention

## Best Practices

1. **Log Granularity**: Log significant events, not every database query
2. **Performance**: Audit logging is async and won't slow down operations
3. **Metadata**: Include context but avoid sensitive data
4. **Severity Levels**: Use appropriately (most events are 'info')
5. **Human-Readable**: Write details that humans can understand
6. **Consistency**: Use the same pattern throughout your app
7. **Testing**: Include audit log assertions in your tests
8. **Monitoring**: Set up alerts for critical severity events
9. **Regular Exports**: Export logs regularly for compliance
10. **Retention**: Set appropriate retention based on your compliance needs

## Troubleshooting

### Audit logs not appearing
- Check that you're calling the audit service AFTER the operation succeeds
- Verify the database migration was applied
- Check application logs for errors

### Export not working
- Verify the user has admin role
- Check retention policy allows exports
- Ensure the organization ID is correct

### Performance issues
- Consider archiving old logs
- Reduce hot storage period
- Add database indexes if querying custom fields

## API Reference

See `apps/app/app/utils/audit.server.ts` for the complete API reference.

## Support

For questions or issues:
1. Check this documentation
2. Review `audit-integration-examples.server.ts` for patterns
3. Check existing usage in the codebase
4. Contact the security/compliance team
