# Findings Detail

## Server-Side Request Forgery (SSRF) via Host header in Healthcheck endpoints

**Severity:** HIGH

### Description
The healthcheck endpoints (`apps/admin/app/routes/resources+/healthcheck.tsx` and `apps/app/app/routes/resources+/healthcheck.tsx`) use `getValidatedHost` from `@repo/common/headers` to validate the `Host` or `X-Forwarded-Host` header. `getValidatedHost` returns the raw, unvalidated `host` when the candidate host does not match the allowed list. This allows an attacker to inject an arbitrary Host header, bypassing the intended validation, and causing the server to fetch an attacker-controlled URL.

### Trace
1. **Entrypoint:** `apps/admin/app/routes/resources+/healthcheck.tsx:7` - The loader receives an HTTP request and calls `getValidatedHost` with the request.
2. **Propagation:** `packages/common/src/headers.server.ts:154` - The function falls back to returning the unvalidated `host` if the `candidateHost` does not match the allowed list.
3. **Sink:** `apps/admin/app/routes/resources+/healthcheck.tsx:19` - The unvalidated host is used to construct a URL and a `fetch` request is made to it.

### Execution
- **Attacker Perspective:** Unauthenticated external attacker.
- **Attack Payload:** `Host: attacker-controlled-domain.com`
- **Instructions:** Send a GET request to the `/resources/healthcheck` endpoint and include a `Host` header set to an attacker-controlled domain.
- **Expected Result:** The server makes a HEAD request to `http://attacker-controlled-domain.com/resources/healthcheck` or `https://attacker-controlled-domain.com/resources/healthcheck`.

### Baseline Comparison
Similar endpoints in comparable systems enforce strict whitelisting of Host headers or rely on explicit configuration for loopback requests rather than extracting the host from the request headers without strict failure modes.

---

## Path Traversal in local image serving endpoint

**Severity:** HIGH

### Description
The `resources/images` endpoint handles serving images either by external URL, from S3, or by reading a local file based on the `src` parameter. When handling local files (where `URL.canParse(src)` is false), the code falls back to returning an `fs` object from `openimg` with the path defined as `"./public" + src`. Since `src` is completely attacker-controlled and unvalidated, an attacker can inject path traversal payloads such as `/../../etc/passwd` to read arbitrary files off the local filesystem.

### Trace
1. **Entrypoint:** `apps/admin/app/routes/resources+/images.tsx:40` - The endpoint retrieves the `src` search parameter from the request URL.
2. **Propagation:** `apps/admin/app/routes/resources+/images.tsx:64` - The code checks if the `src` can be parsed as a URL. Path traversal payloads starting with `/` fail `URL.canParse(src)`.
3. **Propagation:** `apps/admin/app/routes/resources+/images.tsx:80` - If `src` starts with `/assets`, it concatenates `.` with `src`. If not, it falls back to concatenating `./public` with `src` without validation.
4. **Sink:** `apps/admin/app/routes/resources+/images.tsx:86` - The concatenated string containing path traversal characters is returned in the `fs` source object to `openimg`, which uses it to read the local file.

### Execution
- **Attacker Perspective:** Unauthenticated external attacker.
- **Attack Payload:** `src=/../../../../../etc/passwd`
- **Instructions:** Send a GET request to `/resources/images?src=/../../../../../etc/passwd`.
- **Expected Result:** The server responds with the contents of the `/etc/passwd` file, potentially processed as an image or throwing an error that confirms file reading. An attacker could use this to read secrets such as `.env`.

### Baseline Comparison
Comparable image proxy endpoints (e.g., Next.js image optimization) strictly validate the file path to ensure it resides within a specific allowed directory and reject paths containing traversal sequences (`../`).
