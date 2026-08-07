import { ENV } from 'varlock/env'

export type CustomHostnameStatus =
	'pending' | 'active' | 'moved' | 'deleted' | 'blocked' | 'error'

export type CloudflareCustomHostname = {
	id: string
	hostname: string
	status: string
	sslStatus?: string
	ownershipVerification?: {
		type: string
		name: string
		value: string
	} | null
}

type CloudflareApiResult<T> = {
	success: boolean
	errors: Array<{ code?: number; message: string }>
	result: T
}

function getCloudflareConfig() {
	const apiToken = ENV.CLOUDFLARE_API_TOKEN?.trim() || ''
	const zoneId = ENV.CLOUDFLARE_ZONE_ID?.trim() || ''
	const cnameTarget =
		ENV.CLOUDFLARE_CUSTOM_HOSTNAME_CNAME_TARGET?.trim() ||
		'sites.epic-startup.me'

	return {
		apiToken,
		zoneId,
		cnameTarget,
		isConfigured: Boolean(apiToken && zoneId),
	}
}

export function getCustomHostnameCnameTarget() {
	return getCloudflareConfig().cnameTarget
}

export function isCloudflareCustomHostnamesConfigured() {
	return getCloudflareConfig().isConfigured
}

function mapHostnameStatus(status: string | undefined): CustomHostnameStatus {
	switch (status) {
		case 'active':
			return 'active'
		case 'moved':
			return 'moved'
		case 'deleted':
		case 'pending_deletion':
			return 'deleted'
		case 'blocked':
		case 'pending_blocked':
			return 'blocked'
		case 'pending':
		case 'pending_validation':
		case 'pending_provisioned':
		case 'provisioned':
		case 'active_redeploying':
			return 'pending'
		default:
			return status ? 'pending' : 'error'
	}
}

async function cloudflareFetch<T>(
	path: string,
	init?: RequestInit,
): Promise<CloudflareApiResult<T>> {
	const { apiToken, zoneId } = getCloudflareConfig()
	if (!apiToken || !zoneId) {
		throw new Error('Cloudflare custom hostnames are not configured')
	}

	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${zoneId}${path}`,
		{
			...init,
			headers: {
				Authorization: `Bearer ${apiToken}`,
				'Content-Type': 'application/json',
				...init?.headers,
			},
		},
	)

	const data = (await response.json()) as CloudflareApiResult<T>
	if (!response.ok || !data.success) {
		const message =
			data.errors?.map((e) => e.message).join('; ') ||
			`Cloudflare API error (${response.status})`
		throw new Error(message)
	}

	return data
}

function normalizeHostnameResult(result: {
	id: string
	hostname: string
	status?: string
	ssl?: { status?: string }
	ownership_verification?: {
		type?: string
		name?: string
		value?: string
	} | null
}): CloudflareCustomHostname {
	return {
		id: result.id,
		hostname: result.hostname,
		status: mapHostnameStatus(result.status),
		sslStatus: result.ssl?.status,
		ownershipVerification: result.ownership_verification?.name
			? {
					type: result.ownership_verification.type || 'txt',
					name: result.ownership_verification.name,
					value: result.ownership_verification.value || '',
				}
			: null,
	}
}

/**
 * Register a customer domain with Cloudflare for SaaS (Custom Hostnames).
 * When Cloudflare is not configured (local/dev), returns a synthetic pending hostname.
 */
export async function createCustomHostname(
	hostname: string,
): Promise<CloudflareCustomHostname> {
	const normalized = hostname.toLowerCase().trim()

	if (!isCloudflareCustomHostnamesConfigured()) {
		return {
			id: `local-${normalized}`,
			hostname: normalized,
			status: 'pending',
			sslStatus: 'pending_validation',
			ownershipVerification: null,
		}
	}

	const data = await cloudflareFetch<{
		id: string
		hostname: string
		status?: string
		ssl?: { status?: string }
		ownership_verification?: {
			type?: string
			name?: string
			value?: string
		} | null
	}>('/custom_hostnames', {
		method: 'POST',
		body: JSON.stringify({
			hostname: normalized,
			ssl: {
				method: 'http',
				type: 'dv',
			},
			custom_metadata: {
				source: 'epic-startup-sites',
			},
		}),
	})

	return normalizeHostnameResult(data.result)
}

export async function getCustomHostname(
	hostnameId: string,
): Promise<CloudflareCustomHostname | null> {
	if (
		!isCloudflareCustomHostnamesConfigured() ||
		hostnameId.startsWith('local-')
	) {
		return {
			id: hostnameId,
			hostname: hostnameId.replace(/^local-/, ''),
			status: 'active',
			sslStatus: 'active',
			ownershipVerification: null,
		}
	}

	try {
		const data = await cloudflareFetch<{
			id: string
			hostname: string
			status?: string
			ssl?: { status?: string }
			ownership_verification?: {
				type?: string
				name?: string
				value?: string
			} | null
		}>(`/custom_hostnames/${hostnameId}`)
		return normalizeHostnameResult(data.result)
	} catch {
		return null
	}
}

export async function deleteCustomHostname(hostnameId: string): Promise<void> {
	if (
		!isCloudflareCustomHostnamesConfigured() ||
		hostnameId.startsWith('local-')
	) {
		return
	}

	await cloudflareFetch(`/custom_hostnames/${hostnameId}`, {
		method: 'DELETE',
	})
}

/**
 * Normalize and validate a customer hostname (no protocol/path/port).
 */
export function normalizeCustomDomain(input: string): string {
	let value = input.trim().toLowerCase()
	value = value.replace(/^https?:\/\//, '')
	value = value.split('/')[0] ?? value
	value = value.split(':')[0] ?? value
	value = value.replace(/\.$/, '')
	return value
}

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

export function isValidCustomDomain(hostname: string): boolean {
	if (!hostname || hostname.length > 253) return false
	if (hostname.includes('..')) return false
	return DOMAIN_RE.test(hostname)
}
