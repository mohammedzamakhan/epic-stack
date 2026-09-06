import {
	type KVNamespace,
	type KVNamespaceListResult,
} from '@cloudflare/workers-types'

export function getSiteKvKey(
	type: 'org' | 'page',
	id: string,
	queryHash: string,
) {
	return `org:${id}:${type}:${queryHash}`
}

export async function purgeOrganizationSiteCache(
	orgId: string,
	slug?: string,
	host?: string | null,
) {
	const SITES_DATA_KV = process.env.SITES_DATA_KV as unknown as
		KVNamespace | undefined
	if (!SITES_DATA_KV) return

	const prefixes = [`org:${orgId}:`]
	if (slug) prefixes.push(`org:${slug}:`)
	if (host) prefixes.push(`org:${host}:`)

	try {
		for (const prefix of prefixes) {
			let cursor: string | undefined = undefined
			do {
				const keysPage: KVNamespaceListResult<unknown, string> =
					await SITES_DATA_KV.list({ prefix, cursor })
				await Promise.allSettled(
					keysPage.keys.map((key) =>
						SITES_DATA_KV.delete(key.name).catch((e) => {
							console.error(`Failed to delete KV key ${key.name}`, e)
						}),
					),
				)
				cursor = 'cursor' in keysPage ? keysPage.cursor : undefined
			} while (cursor)
		}
	} catch (e) {
		console.error('Failed to purge site KV cache', e)
		throw e
	}
}

export async function getCachedSiteData(key: string) {
	const SITES_DATA_KV = process.env.SITES_DATA_KV as any | undefined
	if (!SITES_DATA_KV) return null
	try {
		const data = await SITES_DATA_KV.get(key, 'json')
		return data
	} catch {
		return null
	}
}

export async function setCachedSiteData(key: string, data: any) {
	const SITES_DATA_KV = process.env.SITES_DATA_KV as any | undefined
	if (!SITES_DATA_KV) return
	try {
		await SITES_DATA_KV.put(key, JSON.stringify(data))
	} catch {}
}
