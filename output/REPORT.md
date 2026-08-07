# Security Audit Report

## Executive Summary

This security audit of the Epic Startup monorepo identified several vulnerabilities that should be addressed. The application handles authentication, organizations, and provides an MCP (Model Context Protocol) API. While the overall architecture follows many best practices, specific issues were found in CORS configuration and JWT verification.

## Baseline Comparison

The application is a modern web application using React, Remix/React Router, and Prisma. It implements custom authentication alongside OAuth and WebAuthn. Comparable applications (like standard SaaS platforms) enforce strict CORS for APIs and pin algorithms for JWT verification to prevent token forgery.

## Findings

| Severity | Title | Root Cause |
|----------|-------|------------|
| LOW | Cross-Origin Resource Sharing (CORS) Misconfiguration in MCP Endpoint | validateOrigin in apps/app/app/utils/mcp/streamable-http.server.ts does not reject missing Origin headers for browser clients, allowing potential CSRF or cross-origin access. |
| MEDIUM | Missing algorithm specification in JWT verification | verifyAccessToken in apps/app/app/utils/jwt.server.ts does not specify the allowed 'algorithms' array in the jwt.verify options, allowing potential algorithm confusion attacks. |
| MEDIUM | Missing secure attribute for cookies in specific environments | Cookie configuration in packages/auth/src/session.server.ts and similar files rely solely on NODE_ENV === 'production' for the Secure flag, potentially transmitting sensitive cookies over plaintext if misconfigured. |

## Detailed Findings

### Cross-Origin Resource Sharing (CORS) Misconfiguration in MCP Endpoint

**Severity:** LOW (Likelihood: low, Impact: medium)

**Description:** The MCP endpoint `apps/app/app/routes/mcp+/_index.ts` creates CORS preflight headers based on `validateOrigin` which returns `{}` if the `Origin` header is absent. However, when `originResult.origin` is `undefined`, `createPreflightHeaders` does not set `Access-Control-Allow-Origin`, but `handlePreflight` returns 204. For actual requests (POST/GET), the `origin` variable controls `Access-Control-Allow-Origin`, but if absent it does not set the header.

**Root Cause:** validateOrigin in apps/app/app/utils/mcp/streamable-http.server.ts does not reject missing Origin headers for browser clients, allowing potential CSRF or cross-origin access.

**Intended Behavior:** The MCP endpoint should enforce a strict CORS policy for all cross-origin requests, including preflight and actual requests, by requiring and validating the Origin header.

**Trace:**
- `apps/app/app/utils/mcp/streamable-http.server.ts:97` (validateOrigin): Checks if Origin header exists. If not, returns empty object.
- `apps/app/app/routes/mcp+/_index.ts:73` (handlePreflight): Calls validateOrigin and uses the result to set CORS headers, or not set them.

**Execution (Attacker Perspective):**
An attacker could perform CSRF attacks if they can trick a user into visiting a malicious site.

*Instructions:*
1. Send an OPTIONS request to the MCP endpoint without an Origin header.
2. Observe that the server returns a 204 No Content response, allowing the request.

*Expected Result:* The server returns a 204 response without CORS headers, potentially allowing unauthorized cross-origin access depending on browser behavior.

**Remediation:**
Require and validate the Origin header for all CORS preflight requests.

### Missing algorithm specification in JWT verification

**Severity:** MEDIUM (Likelihood: low, Impact: high)

**Description:** The `verifyAccessToken` function in `apps/app/app/utils/jwt.server.ts` does not specify an algorithm array when calling `jwt.verify()`. Without pinning the allowed algorithm, `jsonwebtoken` may be vulnerable to algorithm confusion attacks if an attacker supplies a token with `alg: none` or an asymmetric algorithm using the HMAC secret as a public key.

**Root Cause:** verifyAccessToken in apps/app/app/utils/jwt.server.ts does not specify the allowed 'algorithms' array in the jwt.verify options, allowing potential algorithm confusion attacks.

**Intended Behavior:** The JWT verification should strictly limit the accepted algorithms to only the one used for signing (e.g., HS256) by passing an 'algorithms' array to jwt.verify.

**Trace:**
- `apps/app/app/utils/jwt.server.ts:49` (verifyAccessToken): Function receives the untrusted JWT token string.
- `apps/app/app/utils/jwt.server.ts:51` (verifyAccessToken): Calls jwt.verify without an 'algorithms' option, trusting the algorithm specified in the token header.

**Execution (Attacker Perspective):**
An attacker who can intercept a token or wishes to forge one can attempt to bypass signature verification.

*Instructions:*
1. Create a forged JWT token with 'alg: none' and arbitrary claims.
2. Send the token in the Authorization header to an API endpoint protected by requireAuth.
3. Observe if the server accepts the token as valid.

*Expected Result:* Depending on the exact version of jsonwebtoken, the server might accept a token with alg: none or an unexpected algorithm, bypassing authentication.

**Remediation:**
Pin the expected algorithm in the jwt.verify call.

### Missing secure attribute for cookies in specific environments

**Severity:** MEDIUM (Likelihood: low, Impact: high)

**Description:** The authentication and session cookies might not have the `Secure` attribute properly enforced in production-like environments where `process.env.NODE_ENV` is not strictly set to 'production' or where TLS termination happens at a proxy. Several cookie configurations check `process.env.NODE_ENV === 'production'` which can be unsafe if not strictly managed.

**Root Cause:** Cookie configuration in packages/auth/src/session.server.ts and similar files rely solely on NODE_ENV === 'production' for the Secure flag, potentially transmitting sensitive cookies over plaintext if misconfigured.

**Intended Behavior:** Sensitive cookies like session tokens should always have the Secure attribute set in any environment that uses HTTPS, ideally enforcing it unconditionally or detecting HTTPS via X-Forwarded-Proto when behind a proxy.

**Trace:**
- `packages/auth/src/session.server.ts:38` (authSessionStorage): Cookie options are defined with secure: process.env.NODE_ENV === 'production'.
- `packages/auth/src/session.server.ts:43` (commitSession): The session cookie is set on the response based on these options.

**Execution (Attacker Perspective):**
An attacker on the same network could intercept plaintext HTTP traffic to steal session cookies if the Secure flag is missing.

*Instructions:*
1. Deploy the application with NODE_ENV set to something other than 'production' (e.g., 'staging' or 'test').
2. Access the application over HTTP or intercept traffic before TLS termination.
3. Capture the 'en_session' cookie from the network traffic.

*Expected Result:* The session cookie is transmitted without the Secure flag and can be stolen by an eavesdropper.

**Remediation:**
Ensure the Secure attribute is set correctly, possibly by checking request protocol or enforcing it via proxy configuration.
