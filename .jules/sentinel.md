## 2025-02-23 - [Rate Limit Bypass via IP Spoofing]
**Vulnerability:** The rate limiting logic in `apps/app/app/utils/rate-limit.server.ts` blindly trusted `X-Forwarded-For` and ignored `Fly-Client-IP` and `CF-Connecting-IP`.
**Learning:** Even with standard headers like `X-Forwarded-For`, platform-specific headers (like Fly.io's `Fly-Client-IP`) are often more trustworthy and should be prioritized.
**Prevention:** Use a robust IP detection library or utility that understands the deployment environment's specific headers, rather than rolling a simple header check.
