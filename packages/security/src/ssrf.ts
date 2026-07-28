/**
 * SSRF (Server-Side Request Forgery) protection utilities
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
