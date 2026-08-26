# Server-Side Request Forgery (SSRF) in GitLab Integration

## Complete Data Flow

1. **Entrypoint**: `packages/integrations/src/providers/gitlab/provider.ts:150` in `getBaseUrl`
   Reads user-provided instanceUrl from the integration config.

2. **Propagation**: `packages/integrations/src/providers/gitlab/provider.ts:155` in `getBaseUrl`
   Validates the URL using validateInstanceUrl, which is susceptible to DNS bypasses.

3. **Sink**: `packages/integrations/src/providers/gitlab/provider.ts:585` in `getProject`
   Calls fetch() directly with the attacker-controlled instanceUrl without additional IP-level validation.

## Exact Attack Request
The attacker provides the following payload when configuring the GitLab integration instance URL:
```
https://localtest.me:8000
```
This URL resolves to `127.0.0.1`. The application will make authenticated requests to `127.0.0.1:8000`.

## Attacker Impact
The attacker can trigger HTTP requests from the server to arbitrary internal services and IP addresses. Depending on the endpoint triggered, this could result in information disclosure, access to cloud metadata, or unauthorized actions on internal APIs.

## Baseline Comparison
Similar integrations in applications like Jira or Slack process outbound webhooks and API calls through a secure outbound proxy or utilize a hardened HTTP client that resolves DNS records and checks the target IP before opening a connection.
