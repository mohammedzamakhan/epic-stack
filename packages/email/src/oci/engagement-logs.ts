import loggingsearch from 'oci-loggingsearch'
import {
	buildOciMarketingOrgIdLogFilter,
	getMarketingEmailHeaderValue,
} from '@repo/config/marketing-email'
import {
	createOciAuthProvider,
	getOciEmailConfig,
	getOciEmailLogOcid,
	type OciEmailConfig,
} from './config.ts'

export type OciEngagementAction = 'open' | 'click'

export type OciEngagementEvent = {
	action: OciEngagementAction
	messageId: string
	orgId: string | null
	occurredAt: Date
	recipient?: string
}

type RawLogRecord = {
	time?: string
	data?: {
		action?: string
		messageId?: string
		recipient?: string
		headers?: Record<string, string>
	}
}

function getLogOcid(_config: OciEmailConfig): string | null {
	return getOciEmailLogOcid()
}

function normalizeMessageId(rawMessageId: string | undefined): string | null {
	if (!rawMessageId) return null
	const trimmed = rawMessageId.trim()
	if (!trimmed) return null
	const atIndex = trimmed.indexOf('@')
	return atIndex === -1 ? trimmed : trimmed.slice(0, atIndex).trim()
}

export function parseOciEngagementLogRecord(
	record: unknown,
): OciEngagementEvent | null {
	if (!record || typeof record !== 'object') return null

	const root = record as RawLogRecord & { data?: RawLogRecord }
	const payload = (root.data?.data ? root.data : root) as RawLogRecord
	const action = payload.data?.action?.toLowerCase()
	if (action !== 'open' && action !== 'click') return null

	const headers = payload.data?.headers
	const taggedMessageId = getMarketingEmailHeaderValue(headers, 'messageId')
	const messageId =
		taggedMessageId || normalizeMessageId(payload.data?.messageId) || null
	if (!messageId) return null

	const occurredAt = payload.time ? new Date(payload.time) : new Date()
	if (Number.isNaN(occurredAt.getTime())) return null

	return {
		action,
		messageId,
		orgId: getMarketingEmailHeaderValue(headers, 'orgId'),
		occurredAt,
		recipient: payload.data?.recipient,
	}
}

function buildEngagementSearchQuery(logOcid: string, orgId?: string) {
	const orgFilter = orgId ? buildOciMarketingOrgIdLogFilter(orgId) : ''
	return `search "${logOcid}" | (data.action = 'open' or data.action = 'click')${orgFilter} | sort by datetime asc`
}

export async function fetchOciEngagementEvents(options?: {
	lookbackHours?: number
	orgId?: string
}): Promise<OciEngagementEvent[]> {
	const config = getOciEmailConfig()
	const logOcid = config ? getLogOcid(config) : null
	if (!config || !logOcid) return []

	const lookbackHours = options?.lookbackHours ?? 24
	const end = new Date()
	const start = new Date(end)
	start.setUTCHours(start.getUTCHours() - lookbackHours)

	const provider = createOciAuthProvider(config)
	const client = new loggingsearch.LogSearchClient({
		authenticationDetailsProvider: provider,
	})

	const events: OciEngagementEvent[] = []
	const seen = new Set<string>()
	let page: string | undefined

	do {
		const response = await client.searchLogs({
			searchLogsDetails: {
				timeStart: start,
				timeEnd: end,
				searchQuery: buildEngagementSearchQuery(logOcid, options?.orgId),
				isReturnFieldInfo: false,
			},
			limit: 1000,
			page,
		})

		for (const result of response.searchResponse.results ?? []) {
			const parsed = parseOciEngagementLogRecord(result.data)
			if (!parsed) continue
			const dedupeKey = `${parsed.messageId}:${parsed.action}:${parsed.occurredAt.toISOString()}`
			if (seen.has(dedupeKey)) continue
			seen.add(dedupeKey)
			events.push(parsed)
		}

		page = response.opcNextPage || undefined
	} while (page)

	return events
}

export function isOciEngagementLoggingConfigured(): boolean {
	const config = getOciEmailConfig()
	if (!config) return false
	return Boolean(getLogOcid(config))
}
