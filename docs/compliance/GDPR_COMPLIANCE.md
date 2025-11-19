# GDPR Compliance Guide

**Last Updated:** November 19, 2025
**Status:** Implemented
**Compliance Level:** GDPR Article 5, 6, 7, 12-23, 32-34

## Overview

This document outlines how the Epic Stack implements GDPR (General Data Protection Regulation) compliance requirements. The implementation ensures that user personal data is collected, processed, stored, and deleted in accordance with EU data protection laws.

## Table of Contents

1. [GDPR Principles](#gdpr-principles)
2. [Data Subject Rights](#data-subject-rights)
3. [Implementation Details](#implementation-details)
4. [Data Retention](#data-retention)
5. [Security Measures](#security-measures)
6. [Breach Notification](#breach-notification)
7. [Consent Management](#consent-management)
8. [Developer Guidelines](#developer-guidelines)
9. [Compliance Checklist](#compliance-checklist)

---

## GDPR Principles

The application adheres to the seven GDPR principles:

### 1. Lawfulness, Fairness, and Transparency
- ✅ Clear privacy policy explaining data collection and usage
- ✅ Transparent consent mechanisms with granular controls
- ✅ Users informed of their rights and how to exercise them

### 2. Purpose Limitation
- ✅ Data collected only for specified, explicit, and legitimate purposes
- ✅ Different consent types for different processing purposes:
  - Essential services (always required)
  - Analytics (optional)
  - Marketing communications (optional)
  - Data processing for improvements (optional)

### 3. Data Minimization
- ✅ Only necessary data is collected
- ✅ Optional fields clearly marked
- ✅ Prisma queries use `select` to fetch only required fields

### 4. Accuracy
- ✅ Users can update their profile information at any time
- ✅ Email verification ensures accuracy of contact information
- ✅ Audit logs track data modifications

### 5. Storage Limitation
- ✅ Automated data retention policies
- ✅ Regular cleanup of expired data
- ✅ Soft deletion with grace period before permanent deletion
- ✅ Configurable retention periods per data type

### 6. Integrity and Confidentiality (Security)
- ✅ Encryption in transit (TLS/SSL)
- ✅ Encryption at rest for sensitive data
- ✅ Password hashing with bcrypt (cost factor 12)
- ✅ Two-factor authentication support
- ✅ Passkey support for passwordless authentication
- ✅ Rate limiting and DDoS protection (Arcjet)
- ✅ Regular security audits

### 7. Accountability
- ✅ Comprehensive audit logging
- ✅ Data Processing Agreements (DPAs) with third-party processors
- ✅ Regular compliance reviews
- ✅ Documentation of data processing activities

---

## Data Subject Rights

Implementation of GDPR Articles 15-23:

### Right of Access (Article 15)
**Implementation:** `/settings/privacy`

Users can view all their personal data and download a comprehensive export.

**Files:**
- `apps/app/app/routes/settings+/privacy.tsx` - Privacy settings UI
- `apps/app/app/routes/settings+/privacy.export.ts` - Data export functionality

**Data Included in Export:**
- Personal information (email, username, name)
- Consent preferences
- Account status
- Profile image metadata
- Authentication methods
- Active sessions
- Notes and content
- Organization memberships
- Audit logs (last 100 events)
- API keys
- UTM tracking data
- IP address history

### Right to Rectification (Article 16)
**Implementation:** `/settings/profile`

Users can update their personal information at any time.

**Editable Fields:**
- Name
- Email (with verification)
- Username
- Profile picture
- Password

### Right to Erasure (Article 17)
**Implementation:** `/settings/profile#delete-data`

Users can request account deletion with a 30-day grace period.

**Process:**
1. User requests deletion
2. Account marked as deleted (`accountDeletedAt`)
3. All sessions revoked
4. Consent withdrawn
5. 30-day grace period before permanent deletion
6. Automated cleanup via `gdpr-retention.server.ts`

**Files:**
- `apps/app/app/routes/settings+/actions/account.actions.ts`
- `apps/app/app/utils/gdpr-retention.server.ts`

### Right to Data Portability (Article 20)
**Implementation:** `/settings/privacy/export`

Users can download their data in machine-readable JSON format.

**Format:** JSON with structured data including metadata about the export.

**Delivery:** Instant download via browser.

### Right to Restrict Processing (Article 18)
**Implementation:** Consent management in `/settings/privacy`

Users can disable specific types of processing:
- Analytics tracking
- Marketing communications
- Data processing for improvements

Essential services cannot be disabled (required for contract performance).

### Right to Object (Article 21)
**Implementation:** Consent toggles in `/settings/privacy`

Users can object to:
- Marketing communications
- Analytics tracking
- Profiling
- Automated decision-making

### Right to Withdraw Consent (Article 7.3)
**Implementation:** `/settings/privacy`

Users can withdraw consent at any time, as easily as it was given.

**Revoke All Consent Button:** Withdraws all optional consents with one click.

---

## Implementation Details

### Database Schema

**Consent Fields Added to User Model:**
```prisma
model User {
  // GDPR Consent Management
  privacyConsent         Boolean   @default(true)  // Essential
  marketingConsent       Boolean   @default(false) // Marketing
  analyticsConsent       Boolean   @default(false) // Analytics
  dataProcessingConsent  Boolean   @default(false) // Processing
  consentUpdatedAt       DateTime? // Timestamp

  // Data Retention
  accountDeletedAt       DateTime? // Soft delete
  dataRetentionDate      DateTime? // Permanent deletion date
}
```

**New GDPR Models:**
- `DataBreachNotification` - Track and manage data breaches
- `DataRetentionPolicy` - Configure retention periods
- `CookieConsent` - Track cookie consent with proof

### Data Retention Policies

**Default Retention Periods:**

| Entity Type | Retention Period | Auto-Delete | Grace Period |
|-------------|------------------|-------------|--------------|
| Sessions | 30 days | ✅ | 0 days |
| Refresh Tokens | 30 days | ✅ | 0 days |
| Verifications | 7 days | ✅ | 0 days |
| Audit Logs | 365 days | ✅ | 30 days |
| Deleted Users | 30 days | ✅ | 0 days |
| Integration Logs | 90 days | ✅ | 0 days |
| IP Tracking | 180 days | ✅ | 30 days |

**Configuration:**
```typescript
// apps/app/app/utils/gdpr-retention.server.ts
export const DEFAULT_RETENTION_POLICIES = [...]
```

**Automated Cleanup:**
- Run via background job: `packages/background-jobs/src/gdpr-cleanup.ts`
- Recommended schedule: Daily at 2:00 AM UTC
- Can be triggered manually via admin interface

### Consent Management

**Consent Types:**

1. **Essential (Always Required):**
   - Account authentication
   - Service delivery
   - Security and fraud prevention
   - Legal compliance

2. **Analytics (Optional):**
   - Usage statistics
   - Performance monitoring
   - Feature usage tracking

3. **Marketing (Optional):**
   - Product updates
   - Feature announcements
   - Marketing campaigns

4. **Data Processing (Optional):**
   - Service improvements
   - Machine learning
   - Aggregated analytics

**Proof of Consent:**
- Timestamp of consent
- IP address (optional)
- User agent
- Consent version (privacy policy version)
- Method (banner, settings, API)

### Third-Party Processors

All third-party services have Data Processing Agreements (DPAs):

| Processor | Purpose | DPA Status | Data Location |
|-----------|---------|------------|---------------|
| Resend | Email delivery | ✅ | US (SCCs) |
| Stripe | Payment processing | ✅ | US (Adequacy) |
| Tigris/AWS S3 | File storage | ✅ | EU/US |
| Novu | Notifications | ✅ | EU |
| Sentry | Error tracking | ✅ | US (SCCs) |
| BetterStack | Monitoring | ✅ | EU |
| Arcjet | Security | ✅ | Global |

**Standard Contractual Clauses (SCCs):** In place for US processors.

---

## Data Retention

### Automated Cleanup Process

**Service:** `apps/app/app/utils/gdpr-retention.server.ts`

**Functions:**
- `runDataRetentionCleanup()` - Run all cleanup tasks
- `softDeleteUser()` - Soft delete user with grace period
- `initializeRetentionPolicies()` - Set up default policies

**Example Usage:**
```typescript
import { runDataRetentionCleanup } from '#app/utils/gdpr-retention.server.ts'

// Run cleanup
const results = await runDataRetentionCleanup()
console.log(`Cleaned up ${results.sessions} sessions`)
```

**Background Job:**
```typescript
// packages/background-jobs/src/gdpr-cleanup.ts
export const gdprCleanupJob = client.defineJob({
  id: 'gdpr-cleanup',
  name: 'GDPR Data Retention Cleanup',
  version: '1.0.0',
  trigger: cronTrigger({
    cron: '0 2 * * *', // Daily at 2:00 AM UTC
  }),
  run: async (payload, io) => {
    const results = await io.runTask('cleanup', async () => {
      return await runDataRetentionCleanup()
    })
    await io.logger.info('GDPR cleanup completed', results)
  },
})
```

### Soft vs Hard Deletion

**Soft Deletion (Grace Period):**
- User data marked as deleted
- All sessions revoked
- Consent withdrawn
- Data retained for 30 days (configurable)
- User can contact support to recover account

**Hard Deletion (Permanent):**
- All user data permanently deleted
- Cannot be recovered
- Cascade deletes related data
- Logged in audit trail

---

## Security Measures

### Encryption

**In Transit:**
- TLS 1.3
- HTTPS enforced
- Secure WebSocket connections

**At Rest:**
- Database encryption (LiteFS with encryption at rest)
- Sensitive fields encrypted (tokens, secrets)
- Encryption keys rotated regularly

**Encryption Keys:**
```env
ENCRYPTION_KEY=...                    # General encryption
SSO_ENCRYPTION_KEY=...                # SSO tokens
INTEGRATION_ENCRYPTION_KEY=...        # Integration tokens
```

### Authentication Security

- Password hashing: bcrypt (cost 12)
- Session security: HttpOnly cookies, SameSite
- TOTP 2FA support
- Passkey (WebAuthn) support
- OAuth 2.0 with PKCE
- Rate limiting on auth endpoints

### Access Controls

- Role-Based Access Control (RBAC)
- Permission-based authorization
- IP-based access restrictions
- API key authentication for integrations

### Audit Logging

All security-sensitive actions logged:
- User login/logout
- Password changes
- Email changes
- Data exports
- Data deletions
- Consent changes
- Admin actions

**Fields Logged:**
- Action type
- User ID
- IP address
- User agent
- Timestamp
- Resource affected

---

## Breach Notification

### GDPR Requirements (Article 33-34)

**72-Hour Rule:**
- Data breaches must be reported to supervisory authority within 72 hours
- Affected users must be notified without undue delay

### Implementation

**Model:** `DataBreachNotification`

**Fields:**
- Breach date and detection date
- Severity level
- Affected data types
- Description and mitigation steps
- Notification status and timestamps
- Affected user count

**Admin Interface:**
- Create breach notification
- Manage affected users
- Track notification status
- Export breach report

**Automated Notifications:**
- Email to supervisory authority
- Email to affected users
- Admin dashboard alert

**Example:**
```typescript
await prisma.dataBreachNotification.create({
  data: {
    breachDate: new Date('2025-11-15'),
    detectedDate: new Date('2025-11-16'),
    severity: 'high',
    breachType: 'unauthorized_access',
    affectedDataTypes: JSON.stringify(['email', 'name']),
    description: 'Unauthorized access to user database',
    mitigationSteps: 'Passwords reset, systems secured',
    affectedUserCount: 1500,
    within72Hours: true,
  },
})
```

---

## Consent Management

### Cookie Consent

**Banner:** `apps/app/app/components/privacy-banner.tsx`

**Consent Types:**
- Essential (no consent needed)
- Analytics
- Marketing
- Preferences

**Storage:** Cookie + database record for proof

### Marketing Consent

**Opt-in Required:**
- Email marketing
- Product announcements
- Feature updates

**Opt-out Available:**
- One-click unsubscribe
- Privacy settings page
- Email footer link

### Analytics Consent

**Respects Do Not Track:**
- Browser DNT header honored
- No tracking if consent denied
- Anonymized when possible

---

## Developer Guidelines

### Adding New Personal Data Fields

1. **Update Prisma Schema:**
   ```prisma
   model User {
     newField String? // Make optional if possible
   }
   ```

2. **Run Migration:**
   ```bash
   cd packages/prisma
   npx prisma migrate dev --name add_new_field
   ```

3. **Update Data Export:**
   Add field to `privacy.export.ts`:
   ```typescript
   personalInformation: {
     newField: userData.newField,
   }
   ```

4. **Update Privacy Policy:**
   Document what data is collected and why.

5. **Consider Retention:**
   Does this data need a retention policy?

### Checking User Consent

```typescript
import { requireUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }) {
  const userId = await requireUserId(request)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      analyticsConsent: true,
      marketingConsent: true,
    },
  })

  // Only track if user consented
  if (user?.analyticsConsent) {
    await trackEvent(...)
  }
}
```

### Handling Data Deletion

```typescript
import { softDeleteUser } from '#app/utils/gdpr-retention.server.ts'

// Soft delete with grace period
await softDeleteUser(userId, 'user_requested')

// Hard delete (admin only, after grace period)
await prisma.user.delete({ where: { id: userId } })
```

### Audit Logging Best Practices

```typescript
await prisma.auditLog.create({
  data: {
    userId,
    action: 'user_email_changed',
    details: `Email changed from ${oldEmail} to ${newEmail}`,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    resourceType: 'user',
    resourceId: userId,
    severity: 'info',
  },
})
```

---

## Compliance Checklist

### Initial Setup
- [x] Privacy policy created
- [x] Cookie consent banner implemented
- [x] Consent management system
- [x] Data export functionality
- [x] Data deletion functionality
- [x] Data retention policies
- [x] Audit logging system
- [x] Security measures implemented

### Ongoing Compliance
- [ ] Regular security audits
- [ ] DPAs signed with all processors
- [ ] Privacy policy review (annually)
- [ ] Data retention cleanup (automated)
- [ ] Staff training on GDPR
- [ ] Breach response plan tested
- [ ] Consent records maintained
- [ ] Data inventory updated

### User-Facing
- [x] Privacy settings page
- [x] Clear privacy policy
- [x] Easy consent management
- [x] One-click data export
- [x] Account deletion option
- [x] Contact information for DPO
- [x] Supervisory authority info

### Technical
- [x] Prisma schema updated
- [x] Database migrations created
- [x] Retention policies configured
- [x] Background jobs scheduled
- [x] Encryption implemented
- [x] Secure authentication
- [x] Rate limiting
- [x] Audit logging

---

## Testing GDPR Compliance

### Manual Testing

1. **User Registration:**
   - [ ] Consent checkboxes present
   - [ ] Privacy policy linked
   - [ ] Optional fields marked

2. **Consent Management:**
   - [ ] Can view current consents
   - [ ] Can update consents
   - [ ] Can revoke all consents
   - [ ] Changes logged in audit

3. **Data Export:**
   - [ ] Export includes all personal data
   - [ ] JSON format valid
   - [ ] Download works
   - [ ] Export logged in audit

4. **Data Deletion:**
   - [ ] Deletion confirmation required
   - [ ] Grace period explained
   - [ ] Sessions revoked
   - [ ] Deletion logged

5. **Data Retention:**
   - [ ] Old data cleaned up
   - [ ] Policies configurable
   - [ ] Logs retained correctly

### Automated Testing

```typescript
// tests/e2e/gdpr.test.ts
import { test, expect } from '@playwright/test'

test('user can export their data', async ({ page }) => {
  // Login
  await page.goto('/login')
  // ... login flow ...

  // Navigate to privacy settings
  await page.goto('/settings/privacy')

  // Click export button
  const downloadPromise = page.waitForEvent('download')
  await page.click('button:has-text("Export Data")')
  const download = await downloadPromise

  // Verify download
  expect(download.suggestedFilename()).toContain('user-data-export')
  expect(download.suggestedFilename()).toContain('.json')
})
```

---

## Maintenance

### Monthly Tasks
- Review audit logs for anomalies
- Check data retention cleanup results
- Verify consent records
- Update privacy policy if needed

### Quarterly Tasks
- Review DPAs with processors
- Security audit
- Compliance training
- Test breach response plan

### Annual Tasks
- Full GDPR compliance audit
- Privacy policy review
- Data inventory update
- Staff certification renewal

---

## Resources

### Internal Documentation
- [Privacy Policy](/privacy)
- [Security Audit Report](/docs/SECURITY_AUDIT_REPORT.md)
- [Contributing Guidelines](/CONTRIBUTING.md)

### External Resources
- [GDPR Official Text](https://gdpr-info.eu/)
- [ICO GDPR Guide](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [EDPB Guidelines](https://edpb.europa.eu/our-work-tools/general-guidance/gdpr-guidelines-recommendations-best-practices_en)

### Support
- **Privacy Questions:** privacy@example.com
- **Data Protection Officer:** dpo@example.com
- **Security Issues:** security@example.com

---

## Conclusion

This Epic Stack implementation provides a solid foundation for GDPR compliance. However, compliance is an ongoing process that requires:

1. Regular reviews and updates
2. Staff training and awareness
3. Monitoring and audit
4. Continuous improvement

**Remember:** GDPR compliance is not just about legal requirements—it's about respecting user privacy and building trust.

---

**Document Version:** 1.0
**Last Review:** November 19, 2025
**Next Review:** February 19, 2026
**Owner:** Data Protection Officer
