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
	const SITES_DATA_KV = process.env.SITES_DATA_KV as any | undefined
	if (!SITES_DATA_KV) return

	const prefixes = [`org:${orgId}:`]
	if (slug) prefixes.push(`org:${slug}:`)
	if (host) prefixes.push(`org:${host}:`)

	try {
		for (const prefix of prefixes) {
			let cursor: string | undefined = undefined
			do {
				const keysPage: any = await SITES_DATA_KV.list({ prefix, cursor })
				for (const key of keysPage.keys) {
					await SITES_DATA_KV.delete(key.name)
				}
				cursor = keysPage.list_complete ? undefined : keysPage.cursor
			} while (cursor)
		}
	} catch (e) {
		console.error('Failed to purge site KV cache', e)
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
