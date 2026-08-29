import { DurableObject } from 'cloudflare:workers'

const REGISTRY_KEY = 'orgIds'

export class TenantRegistry extends DurableObject {
	async list(): Promise<string[]> {
		return (await this.ctx.storage.get<string[]>(REGISTRY_KEY)) ?? []
	}

	async add(orgId: string) {
		const ids = await this.list()
		if (ids.includes(orgId)) return
		ids.push(orgId)
		await this.ctx.storage.put(REGISTRY_KEY, ids)
	}

	async remove(orgId: string) {
		const ids = (await this.list()).filter((id) => id !== orgId)
		await this.ctx.storage.put(REGISTRY_KEY, ids)
	}
}
