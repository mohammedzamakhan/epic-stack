# Security Audit Report

**Date:** January 17, 2026  
**Scope:** Epic Startup Monorepo - Authentication, Authorization, and OAuth Security  
**Auditor:** Automated Security Analysis

---

## Executive Summary

This security audit identified **7 vulnerabilities** across the codebase, with 2 high-severity issues in the MCP OAuth implementation and 5 medium/low-severity issues in rate limiting, access control, and authentication flows.

| Severity | Count | Categories |
|----------|-------|------------|
| 🔴 High | 2 | OAuth Implementation |
| 🟠 Medium | 4 | Rate Limiting, Access Control, Business Logic |
| 🟡 Low | 1 | Defense in Depth |

---

## Critical Vulnerabilities

### Bug 1: Static Client ID in OAuth Dynamic Registration

**Severity:** 🔴 High  
**Location:** [`apps/app/app/routes/mcp+/register.ts#L21-L23`](apps/app/app/routes/mcp+/register.ts#L21-L23)  
**CWE:** CWE-287 (Improper Authentication)

#### Summary

- **Context:** MCP OAuth Dynamic Client Registration endpoint
- **Bug:** All clients receive the same hardcoded `client_id: 'mcp-public-client'`
- **Actual vs. expected:** All OAuth clients share the same identifier vs. each client should receive a unique ID
- **Impact:** Cannot distinguish between clients, no per-client audit trail, potential token confusion attacks

#### Code with Bug

```typescript
// ❌ BAD: All clients get the same static client_id
return Response.json(
  {
    client_id: 'mcp-public-client',  // Hardcoded!
    client_name: body.client_name || 'MCP Client',
    redirect_uris: body.redirect_uris || [],  // Not validated or stored!
    ...
  }
)
```

#### Exploit Scenario

1. Attacker registers their malicious MCP client
2. Legitimate user registers their client
3. Both receive `client_id: 'mcp-public-client'`
4. Attacker can potentially use authorization codes or tokens meant for legitimate clients
5. Audit logs cannot distinguish which client performed actions

#### Recommended Fix

```typescript
import { generateToken } from '#app/utils/mcp/oauth.server.ts'

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json()
  
  // Generate unique client ID
  const clientId = generateToken()
  
  // Store client metadata in database
  await prisma.mCPClient.create({
    data: {
      clientId,
      clientName: body.client_name || 'MCP Client',
      redirectUris: body.redirect_uris || [],
    }
  })
  
  return Response.json({
    client_id: clientId,
    ...
  })
}
```

---

### Bug 2: Redirect URI Not Validated Against Registered URIs

**Severity:** 🔴 High  
**Location:** [`apps/app/app/utils/mcp/oauth.server.ts#L29-L30`](apps/app/app/utils/mcp/oauth.server.ts#L29-L30)  
**CWE:** CWE-601 (URL Redirection to Untrusted Site)

#### Summary

- **Context:** MCP OAuth authorization flow
- **Bug:** The `redirect_uri` provided during authorization is not validated against the URIs registered during client registration
- **Actual vs. expected:** Any localhost/custom-scheme URI is accepted vs. should only accept pre-registered URIs
- **Impact:** Open redirect within allowed patterns, potential OAuth code interception

#### Code with Bug

```typescript
/**
 * In production, you should also validate against pre-registered redirect URIs
 * stored per-client in the database.  // <-- TODO not implemented!
 */
export function validateMCPRedirectUri(redirectUri: string) {
  // Only checks if localhost or allowed custom scheme
  // Does NOT check against registered redirect_uris from registration
}
```

#### Exploit Scenario

1. Attacker registers client with `redirect_uris: ['http://localhost:3000/callback']`
2. During authorization, attacker provides `redirect_uri=http://localhost:9999/steal`
3. System accepts it (localhost is allowed)
4. Authorization code is sent to attacker's malicious callback server

#### Recommended Fix

```typescript
export async function validateMCPRedirectUri(
  redirectUri: string, 
  clientId: string
): Promise<{ isValid: boolean; error?: string }> {
  // First, basic format validation
  const basicValidation = validateRedirectUriFormat(redirectUri)
  if (!basicValidation.isValid) return basicValidation
  
  // Then validate against registered URIs
  const client = await prisma.mCPClient.findUnique({
    where: { clientId },
    select: { redirectUris: true }
  })
  
  if (!client?.redirectUris.includes(redirectUri)) {
    return { isValid: false, error: 'redirect_uri not registered for this client' }
  }
  
  return { isValid: true }
}
```

---

## Medium Severity Vulnerabilities

### Bug 3: Rate Limiting Fails Open on Database Error

**Severity:** 🟠 Medium  
**Location:** [`apps/app/app/utils/rate-limit.server.ts#L98-L106`](apps/app/app/utils/rate-limit.server.ts#L98-L106)  
**CWE:** CWE-754 (Improper Check for Unusual or Exceptional Conditions)

#### Summary

- **Context:** MCP OAuth token endpoint rate limiting
- **Bug:** When database fails, rate limiting returns `allowed: true`
- **Actual vs. expected:** Request bypasses rate limit vs. should fail closed (deny request)
- **Impact:** Denial of service protection bypassed, brute force attacks possible during DB issues

#### Code with Bug

```typescript
} catch (error) {
  // ❌ BAD: If database fails, allow the request
  console.error('Rate limit check failed:', error)
  return {
    allowed: true,  // Fails open!
    remaining: config.maxRequests - 1,
    resetAt: new Date(now.getTime() + config.windowMs),
  }
}
```

#### Exploit Scenario

1. Attacker identifies that rate limiting uses database
2. Attacker triggers database connection pool exhaustion (e.g., many slow queries)
3. Rate limit checks start failing
4. All rate-limited endpoints become unprotected
5. Attacker performs brute force attacks on token endpoint

#### Recommended Fix

```typescript
} catch (error) {
  console.error('Rate limit check failed:', error)
  // Fail closed - deny request when rate limiting is unavailable
  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(now.getTime() + 60000), // Retry in 1 minute
  }
}
```

---

### Bug 4: Soft Delete Bypass - Missing `active: true` Check

**Severity:** 🟠 Medium  
**Location:** Multiple files (see below)  
**CWE:** CWE-863 (Incorrect Authorization)

#### Summary

- **Context:** Organization access checks via `users: { some: { userId } }`
- **Bug:** Several queries check organization membership without filtering on `active: true`
- **Actual vs. expected:** Deactivated members retain access vs. should be denied
- **Impact:** Privilege persistence after membership revocation

#### Affected Files

| File | Line |
|------|------|
| `apps/app/app/routes/_app+/$orgSlug_+/index.tsx` | L44, L174 |
| `apps/app/app/routes/_app+/$orgSlug_+/__org-note-editor.server.tsx` | L50 |

#### Code with Bug

```typescript
// ❌ BAD: Missing active: true filter
const organization = await prisma.organization.findFirst({
  where: { slug: orgSlug, users: { some: { userId: userId } } },
  //                                        ↑ Missing: active: true
})
```

**Note:** The proper check exists in [`organizations.server.ts#L479`](apps/app/app/utils/organization/organizations.server.ts#L479) but isn't used consistently:

```typescript
// ✅ GOOD: Correct implementation in userHasOrgAccess
const userOrg = await prisma.userOrganization.findFirst({
  where: {
    userId,
    organizationId,
    active: true,  // Properly filtered
  },
})
```

#### Exploit Scenario

1. Admin removes user from organization (sets `active: false`)
2. User still has the organization URL
3. User accesses `/$orgSlug/` - membership check passes because `active` not filtered
4. Deactivated user can still view/edit organization resources

#### Recommended Fix

```typescript
const organization = await prisma.organization.findFirst({
  where: { 
    slug: orgSlug, 
    users: { some: { userId, active: true } }  // ✅ Add active check
  },
})
```

---

### Bug 5: Passkey Deletion Without Lockout Protection

**Severity:** 🟠 Medium  
**Location:** [`apps/app/app/routes/settings+/actions/passkey.actions.ts#L14-L31`](apps/app/app/routes/settings+/actions/passkey.actions.ts#L14-L31)  
**CWE:** CWE-284 (Improper Access Control)

#### Summary

- **Context:** User security settings - passkey management
- **Bug:** Users can delete passkeys without verification that they have alternative auth methods
- **Actual vs. expected:** Last passkey can be deleted even with no password/connections vs. should prevent lockout
- **Impact:** Account lockout - user loses all authentication methods

#### Code with Bug

```typescript
export async function deletePasskeyAction({ formData, userId }: PasskeyActionArgs) {
  const passkeyId = formData.get('passkeyId')
  // ❌ BAD: No check if user has other auth methods
  await prisma.passkey.delete({
    where: { id: passkeyId, userId },
  })
  return Response.json({ status: 'success' })
}
```

#### Contrast with Connections (Correct Implementation)

```typescript
// ✅ GOOD: Connections properly checks for lockout
async function userCanDeleteConnections(userId: string) {
  const user = await prisma.user.findUnique({
    select: { 
      password: { select: { userId: true } }, 
      _count: { select: { connections: true } } 
    },
    where: { id: userId },
  })
  if (user?.password) return true
  return Boolean(user?._count.connections && user?._count.connections > 1)
}
```

#### Exploit Scenario

1. User sets up passkey as only auth method (no password, no SSO)
2. User deletes their passkey from settings
3. User is now locked out of account with no recovery options

#### Recommended Fix

```typescript
async function userCanDeletePasskeys(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    select: { 
      password: { select: { userId: true } }, 
      _count: { select: { passkeys: true, connections: true } } 
    },
    where: { id: userId },
  })
  // Allow deletion if user has password OR other passkeys OR connections
  if (user?.password) return true
  if ((user?._count.connections ?? 0) > 0) return true
  return (user?._count.passkeys ?? 0) > 1
}

export async function deletePasskeyAction({ formData, userId }: PasskeyActionArgs) {
  const canDelete = await userCanDeletePasskeys(userId)
  if (!canDelete) {
    return Response.json(
      { status: 'error', error: 'Cannot delete last authentication method' },
      { status: 400 }
    )
  }
  // ... proceed with deletion
}
```

---

### Bug 6: Arcjet Security Bypass on Service Failure

**Severity:** 🟠 Medium  
**Location:** Multiple auth routes  
**CWE:** CWE-636 (Not Failing Securely)

#### Summary

- **Context:** Login, signup, and forgot-password routes with Arcjet WAF protection
- **Bug:** When Arcjet service fails, authentication proceeds without protection
- **Actual vs. expected:** Requests bypass bot/rate-limit protection vs. should fail safely
- **Impact:** Bot attacks and credential stuffing possible during Arcjet outages

#### Affected Files

| File | Lines |
|------|-------|
| `apps/app/app/routes/_auth+/login.tsx` | L149-L152 |
| `apps/app/app/routes/_auth+/signup.tsx` | L139-L142 |
| `apps/app/app/routes/_auth+/forgot-password.tsx` | L102-L105 |

#### Code with Bug

```typescript
} catch (error) {
  // ❌ BAD: If Arcjet fails, continue with login process
  console.error('Arcjet protection failed:', error)
}
// Login proceeds without protection
```

#### Exploit Scenario

1. Attacker monitors for Arcjet service disruptions
2. When Arcjet is down, attacker launches credential stuffing attack
3. All bot detection and rate limiting is bypassed
4. Mass account compromise possible

#### Recommended Fix

```typescript
} catch (error) {
  console.error('Arcjet protection failed:', error)
  // Fail closed for security-critical endpoints
  return data(
    { result: null }, 
    { status: 503, statusText: 'Security service temporarily unavailable' }
  )
}
```

---

## Low Severity Vulnerabilities

### Bug 7: IP Address Fallback to Shared Bucket

**Severity:** 🟡 Low  
**Location:** [`packages/security/src/ip-address.server.ts#L90`](packages/security/src/ip-address.server.ts#L90)  
**CWE:** CWE-770 (Allocation of Resources Without Limits)

#### Summary

- **Context:** Client IP extraction for rate limiting
- **Bug:** When IP cannot be determined, defaults to `127.0.0.1`
- **Actual vs. expected:** All unidentifiable requests share rate limit bucket vs. should use unique identifier or reject
- **Impact:** Rate limit bypass when behind misconfigured proxies

#### Code with Bug

```typescript
const { fallback = '127.0.0.1', returnUndefined = false } = options
// ...
return returnUndefined ? undefined : fallback  // All unknown IPs = same bucket
```

#### Exploit Scenario

1. Attacker routes requests through proxy that strips IP headers
2. All attacker requests are attributed to `127.0.0.1`
3. Legitimate localhost requests share rate limit with attacker
4. Either: attacker consumes localhost's rate limit, OR multiple attackers share one bucket

#### Recommended Fix

For security-critical endpoints, use `returnUndefined: true` and fail closed:

```typescript
const clientIp = getClientIp(request, { returnUndefined: true })
if (!clientIp) {
  return Response.json(
    { error: 'Cannot determine client IP' }, 
    { status: 400 }
  )
}
```

---

## Remediation Priority

| Priority | Bug # | Issue | Effort |
|----------|-------|-------|--------|
| 1 | #1, #2 | OAuth client registration & redirect validation | Medium |
| 2 | #4 | Soft-delete bypass (`active: true`) | Low |
| 3 | #5 | Passkey lockout protection | Low |
| 4 | #3, #6 | Fail-open security controls | Low |
| 5 | #7 | IP fallback handling | Low |

---

## References

- [OWASP OAuth Security](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/05-Testing_for_OAuth_Weaknesses)
- [RFC 7591 - OAuth Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [CWE Database](https://cwe.mitre.org/)
