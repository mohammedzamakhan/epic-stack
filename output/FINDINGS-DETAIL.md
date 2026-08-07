# Findings Detail

## Cross-Origin Resource Sharing (CORS) Misconfiguration in MCP Endpoint

### Data Flow
- **File:** `apps/app/app/utils/mcp/streamable-http.server.ts:97`
  **Scope:** `validateOrigin`
  **Description:** Checks if Origin header exists. If not, returns empty object.
- **File:** `apps/app/app/routes/mcp+/_index.ts:73`
  **Scope:** `handlePreflight`
  **Description:** Calls validateOrigin and uses the result to set CORS headers, or not set them.

### Attack Scenario
**Perspective:** An attacker could perform CSRF attacks if they can trick a user into visiting a malicious site.

**Payloads:**
```
curl -X OPTIONS http://localhost:3000/mcp
```

**Impact:** The server returns a 204 response without CORS headers, potentially allowing unauthorized cross-origin access depending on browser behavior.

### Remediation Code Changes
**File:** `apps/app/app/utils/mcp/streamable-http.server.ts`
```javascript
export function validateOrigin(request: Request): { origin?: string } | Response {
	const origin = request.headers.get('Origin')

	if (!origin) {
		return Response.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Missing Origin header' } }, { status: 403 })
	}

	const allowedOrigins = getAllowedOrigins()

	// Check if origin is in allowlist
	if (allowedOrigins.includes(origin)) {
		return { origin }
	}

	// Check for wildcard patterns
	for (const allowed of allowedOrigins) {
		if (allowed.startsWith('*.')) {
			const domain = allowed.slice(2)
			try {
				const originUrl = new URL(origin)
				if (originUrl.hostname === domain || originUrl.hostname.endsWith('.' + domain)) {
					return { origin }
				}
			} catch {}
		}
	}

	return Response.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Origin not allowed' } }, { status: 403 })
}
```

---

## Missing algorithm specification in JWT verification

### Data Flow
- **File:** `apps/app/app/utils/jwt.server.ts:49`
  **Scope:** `verifyAccessToken`
  **Description:** Function receives the untrusted JWT token string.
- **File:** `apps/app/app/utils/jwt.server.ts:51`
  **Scope:** `verifyAccessToken`
  **Description:** Calls jwt.verify without an 'algorithms' option, trusting the algorithm specified in the token header.

### Attack Scenario
**Perspective:** An attacker who can intercept a token or wishes to forge one can attempt to bypass signature verification.

**Payloads:**
```
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.
```

**Impact:** Depending on the exact version of jsonwebtoken, the server might accept a token with alg: none or an unexpected algorithm, bypassing authentication.

### Remediation Code Changes
**File:** `apps/app/app/utils/jwt.server.ts`
```javascript
export function verifyAccessToken(token: string): JWTPayload | null {
	try {
		const decoded = jwt.verify(token, JWT_SECRET, {
			issuer: 'your-app-name',
			audience: 'mobile-app',
			algorithms: ['HS256'],
		}) as JWTPayload
		return decoded
	} catch {
		return null
	}
}
```

---

## Missing secure attribute for cookies in specific environments

### Data Flow
- **File:** `packages/auth/src/session.server.ts:38`
  **Scope:** `authSessionStorage`
  **Description:** Cookie options are defined with secure: process.env.NODE_ENV === 'production'.
- **File:** `packages/auth/src/session.server.ts:43`
  **Scope:** `commitSession`
  **Description:** The session cookie is set on the response based on these options.

### Attack Scenario
**Perspective:** An attacker on the same network could intercept plaintext HTTP traffic to steal session cookies if the Secure flag is missing.

**Payloads:**
```
Network sniffing tools like Wireshark or tcpdump.
```

**Impact:** The session cookie is transmitted without the Secure flag and can be stolen by an eavesdropper.

### Remediation Code Changes
**File:** `packages/auth/src/session.server.ts`
```javascript
// Enforce secure cookies in non-development environments
secure: process.env.NODE_ENV !== 'development',
```

---
