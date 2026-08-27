/**
 * SSRF (Server-Side Request Forgery) protection utilities
 *
 * Provides both textual URL validation and DNS-resolution-based
 * validation to prevent DNS rebinding attacks.
 */

import dns from 'node:dns'

/**
 * Check whether an IP address falls in a private, loopback, link-local,
 * or otherwise non-routable range.
 */
export function isPrivateIp(ip: string): boolean {
	// IPv4
	const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
	const match = ip.match(ipv4Regex)
	if (match) {
		const p1 = Number(match[1])
		const p2 = Number(match[2])
		return (
			p1 === 0 || // 0.0.0.0/8 - current network
			p1 === 10 || // 10.0.0.0/8
			p1 === 127 || // 127.0.0.0/8 - loopback
			(p1 === 172 && p2 >= 16 && p2 <= 31) || // 172.16.0.0/12
			(p1 === 192 && p2 === 168) || // 192.168.0.0/16
			(p1 === 169 && p2 === 254) || // 169.254.0.0/16 - link-local / cloud metadata
			(p1 === 100 && p2 >= 64 && p2 <= 127) || // 100.64.0.0/10 - CGNAT / cloud VPC
			p1 >= 240 // 240.0.0.0/4 - reserved
		)
	}

	// IPv6 - normalize by stripping brackets and lowercasing
	const normalized = ip.replace(/^\[|\]$/g, '').toLowerCase()
	return (
		normalized === '::1' || // loopback
		normalized === '::' || // unspecified
		normalized.startsWith('fd') || // unique-local (fc00::/7, practically fd00::/8)
		normalized.startsWith('fc') || // unique-local
		normalized.startsWith('fe8') || // link-local (fe80::/10)
		normalized.startsWith('fe9') ||
		normalized.startsWith('fea') ||
		normalized.startsWith('feb') ||
		normalized.startsWith('::ffff:127.') || // IPv4-mapped loopback
		normalized.startsWith('::ffff:10.') || // IPv4-mapped private
		normalized.startsWith('::ffff:192.168.') || // IPv4-mapped private
		normalized.startsWith('::ffff:169.254.') // IPv4-mapped link-local
	)
}

/**
 * Textual URL validation — checks scheme, credentials, and hostname strings.
 * Synchronous and fast, but does NOT protect against DNS rebinding.
 * Use `validateInstanceUrlWithDns` for full protection.
 */
export function validateInstanceUrl(urlStr: string): {
	valid: boolean
	reason?: string
} {
	try {
		const parsed = new URL(urlStr)

		// Require HTTPS scheme exclusively
		if (parsed.protocol !== 'https:') {
			return { valid: false, reason: 'Invalid protocol: HTTPS is required' }
		}

		// Block credentials in URLs (e.g., https://user:pass@host)
		if (parsed.username || parsed.password) {
			return {
				valid: false,
				reason: 'URL contains credentials (SSRF protection)',
			}
		}

		const hostname = parsed.hostname.toLowerCase()

		// Block localhost, internal hostnames, and cloud metadata endpoints
		if (
			hostname === 'localhost' ||
			hostname.endsWith('.local') ||
			hostname.endsWith('.internal') ||
			hostname === '169.254.169.254' ||
			hostname === '0.0.0.0' ||
			hostname === '::1' ||
			hostname === '[::1]'
		) {
			return {
				valid: false,
				reason: 'Forbidden target domain or IP (SSRF protection)',
			}
		}

		// Block IPv6 unique-local (fd00::/8) and link-local (fe80::/10) ranges
		if (
			hostname.startsWith('fd') ||
			hostname.startsWith('[fd') ||
			hostname.startsWith('fe8') ||
			hostname.startsWith('[fe8') ||
			hostname.startsWith('fe9') ||
			hostname.startsWith('[fe9') ||
			hostname.startsWith('fea') ||
			hostname.startsWith('[fea') ||
			hostname.startsWith('feb') ||
			hostname.startsWith('[feb')
		) {
			return {
				valid: false,
				reason:
					'IPv6 unique-local/link-local address blocked (SSRF protection)',
			}
		}

		// Private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16)
		const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
		const match = hostname.match(ipv4Regex)
		if (match) {
			const p1 = Number(match[1])
			const p2 = Number(match[2])
			if (
				p1 === 10 ||
				p1 === 127 ||
				(p1 === 172 && p2 >= 16 && p2 <= 31) ||
				(p1 === 192 && p2 === 168) ||
				(p1 === 169 && p2 === 254)
			) {
				return {
					valid: false,
					reason: 'Private/Internal IP address blocked (SSRF protection)',
				}
			}
		}

		return { valid: true }
	} catch {
		return { valid: false, reason: 'Invalid URL format' }
	}
}

/**
 * Full URL validation with DNS resolution.
 * Resolves the hostname and checks that none of the resolved IPs are
 * private/internal. This prevents DNS rebinding attacks where a hostname
 * like `localtest.me` resolves to `127.0.0.1`.
 */
export async function validateInstanceUrlWithDns(urlStr: string): Promise<{
	valid: boolean
	reason?: string
}> {
	// Run textual checks first (fast path)
	const textualResult = validateInstanceUrl(urlStr)
	if (!textualResult.valid) {
		return textualResult
	}

	const parsed = new URL(urlStr)
	const hostname = parsed.hostname

	// If the hostname is already an IP literal, check it directly
	if (isPrivateIp(hostname)) {
		return {
			valid: false,
			reason: 'Private/Internal IP address blocked (SSRF protection)',
		}
	}

	// Resolve DNS and validate all returned IPs
	try {
		const [ipv4Results, ipv6Results] = await Promise.allSettled([
			dns.promises.resolve4(hostname),
			dns.promises.resolve6(hostname),
		])

		const resolvedIps: string[] = []

		if (ipv4Results.status === 'fulfilled') {
			resolvedIps.push(...ipv4Results.value)
		}
		if (ipv6Results.status === 'fulfilled') {
			resolvedIps.push(...ipv6Results.value)
		}

		// If we got no IPs at all, DNS resolution failed
		if (resolvedIps.length === 0) {
			return {
				valid: false,
				reason: 'DNS resolution failed for hostname',
			}
		}

		// Check every resolved IP
		for (const ip of resolvedIps) {
			if (isPrivateIp(ip)) {
				return {
					valid: false,
					reason: `DNS resolves to private/internal IP address (SSRF protection): ${ip}`,
				}
			}
		}

		return { valid: true }
	} catch {
		return {
			valid: false,
			reason: 'DNS resolution failed for hostname',
		}
	}
}

/**
 * SSRF-safe fetch wrapper.
 *
 * Validates the URL (including DNS resolution) before making the request.
 * Blocks redirects to prevent redirect-based SSRF bypasses.
 *
 * Use this instead of raw `fetch()` for any request where the URL is
 * derived from user-controlled input.
 */
export async function ssrfSafeFetch(
	url: string | URL,
	init?: RequestInit,
): Promise<Response> {
	const urlStr = typeof url === 'string' ? url : url.toString()

	const validation = await validateInstanceUrlWithDns(urlStr)
	if (!validation.valid) {
		throw new Error(`SSRF security validation failed: ${validation.reason}`)
	}

	return fetch(urlStr, {
		...init,
		// Block redirects — a safe URL could redirect to an internal one.
		// Callers that need to follow redirects should validate each hop.
		redirect: 'error',
	})
}
