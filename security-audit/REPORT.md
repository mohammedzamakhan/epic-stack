# Security Audit Report

## Executive Summary
This application is a monolithic web application structured using NPM workspaces. It consists of multiple frontend applications (`apps/app`, `apps/admin`, `apps/web`), several APIs and internal services (`apps/tenant-api`, `apps/jobs-cron`), and a robust package ecosystem. The audit identified a high-severity Server-Side Request Forgery (SSRF) vulnerability. The validation utilities intended to prevent SSRF are insufficient, allowing attacks utilizing custom domains and obscure IP formats. However, the system relies on well-configured protections overall, with secure token and configuration storage processes.

## Baseline Comparable
Comparables are multi-tenant SaaS applications utilizing microservices (e.g., Slack, GitHub, Notion). These applications accept the risk of external HTTP requests to support custom webhooks and user-configurable instances. However, they rely on robust network filtering and DNS resolution proxying to isolate backend and internal network traffic from SSRF attacks.

## Findings Table

| Severity | Title | Description |
| --- | --- | --- |
| HIGH | Server-Side Request Forgery (SSRF) in GitLab Integration | Insufficient SSRF validation on custom instance URLs enables DNS rebinding and internal network requests. |

## Detailed Findings

### Server-Side Request Forgery (SSRF) in GitLab Integration

- **Severity**: HIGH
- **File**: `packages/integrations/src/providers/gitlab/provider.ts`
- **Description**: The GitLab integration allows users to configure a custom `instanceUrl` for self-hosted instances. While the URL is validated against a denylist using `validateInstanceUrl`, it fails to prevent SSRF because `validateInstanceUrl` allows resolving external domains that point to internal IP addresses (DNS rebinding / localtest.me). Additionally, the GitLab provider directly uses `fetch` instead of `safeFetch`, completely bypassing SSRF protections for DNS resolution time. This allows an attacker to make arbitrary authenticated HTTP requests to internal network services (e.g., metadata endpoints, internal APIs) via the `instanceUrl`.
- **Concrete Attack Scenario**: A user with integration setup permissions configures a GitLab integration. They set the custom instance URL to a domain resolving to an internal IP (e.g., `https://localtest.me:8000`). They trigger an integration action (e.g., syncing projects), causing the server to fetch from the internal IP.
- **Impact**: Allows access to internal network services, metadata endpoints, or other restricted APIs.
- **Recommended Fix**: Implement and enforce a safe fetch wrapper (`safeFetch`) in `GitLabProvider` (and all other providers) that performs DNS resolution and checks the resolved IP against a denylist of private ranges before establishing the HTTP connection. Replace all direct `fetch` calls with `safeFetch`.

## Hardening Notes
- **Robust SSRF Validation**: The `validateInstanceUrl` utility uses a basic regex `^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$` to check for IPv4 addresses. This regex fails to catch other representations of IP addresses, such as hexadecimal (`0x7f000001`), octal (`0177.0.0.1`), integer (`2130706433`), or short forms (`127.1`). It also doesn't perform DNS resolution to identify malicious domains resolving to internal IPs (DNS rebinding). Consider employing a specialized library for SSRF prevention or running outgoing HTTP requests through an isolated, restricted proxy.
- **GDPR Account Deletion Rate Limit**: Add an email confirmation before allowing an account to be scheduled for deletion via `createErasureRequest`. Wait, it's scheduled with a 7 day grace period. It should still notify the user by email so they can cancel it if their account is compromised.
- **Content Sanitization**: Review `dangerouslySetInnerHTML` uses in React components, like the image proxy and translation components.

## Positive Patterns
- **Database Architecture**: SQLite is used for tenant databases, which isolates tenant data well.
- **Authentication**: Usage of `bcryptjs` for password hashing, and cookie session storages with secrets for authentication is well implemented.
