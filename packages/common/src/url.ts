import { getLocalDomain } from '@repo/config/brand'

function defaultDevUrl(targetSubdomain: string, path = '') {
	return `http://${targetSubdomain}.${getLocalDomain()}:2999${path}`
}

function defaultOrgSiteUrl(orgSlug: string) {
	return `https://${orgSlug}.${getLocalDomain()}:2999`
}

/**
 * Generate a cross-app URL by replacing the subdomain of the current host.
 * Useful for linking between apps in the same domain (e.g., app.example.com -> docs.example.com)
 *
 * This is a client-only utility that requires the browser window object.
 *
 * @param targetSubdomain - The subdomain to use (e.g., 'docs', 'admin')
 * @param path - Optional path to append (e.g., '/integrations/slack')
 * @param fallbackUrl - Optional fallback URL if domain parsing fails
 * @returns The generated URL
 *
 * @example
 * // On app.example.com:2999
 * getCrossAppUrl('docs', '/integrations/slack')
 * // Returns: 'http://docs.example.com:2999/integrations/slack'
 *
 * @example
 * // On app.xyz.com
 * getCrossAppUrl('admin', '/users')
 * // Returns: 'https://admin.xyz.com/users'
 */
export function getCrossAppUrl(
	targetSubdomain: string,
	path: string = '',
	fallbackUrl?: string,
): string {
	if (typeof window === 'undefined') {
		return fallbackUrl ?? defaultDevUrl(targetSubdomain, path)
	}

	const currentHost = window.location.host
	const hostParts = currentHost.split(':')
	const hostWithoutPort = hostParts[0] ?? currentHost
	const port = hostParts[1] ? `:${hostParts[1]}` : ''

	const domainParts = hostWithoutPort.split('.')

	if (domainParts.length >= 2) {
		// Get the base domain (last two parts)
		const baseDomain = domainParts.slice(-2).join('.')
		const protocol = window.location.protocol

		return `${protocol}//${targetSubdomain}.${baseDomain}${port}${path}`
	}

	return fallbackUrl ?? defaultDevUrl(targetSubdomain, path)
}

/**
 * Generate the public Sites URL for an organization slug.
 * Uses the org slug as a subdomain of the brand base domain.
 *
 * @param orgSlug - Organization slug (subdomain label)
 * @param fallbackUrl - Optional fallback when window is unavailable
 */
export function getOrgSiteUrl(orgSlug: string, fallbackUrl?: string): string {
	if (typeof window === 'undefined') {
		return fallbackUrl ?? defaultOrgSiteUrl(orgSlug)
	}

	const currentHost = window.location.host
	const hostParts = currentHost.split(':')
	const hostWithoutPort = hostParts[0] ?? currentHost
	const port = hostParts[1] ? `:${hostParts[1]}` : ''
	const domainParts = hostWithoutPort.split('.')

	if (domainParts.length >= 2) {
		const baseDomain = domainParts.slice(-2).join('.')
		const protocol = window.location.protocol
		return `${protocol}//${orgSlug}.${baseDomain}${port}`
	}

	return fallbackUrl ?? defaultOrgSiteUrl(orgSlug)
}
