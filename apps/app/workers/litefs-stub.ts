export async function getInstanceInfo() {
	return {
		currentInstance: 'cloudflare-worker',
		primaryInstance: 'cloudflare-worker',
		currentIsPrimary: true,
	}
}

export async function getAllInstances() {
	return []
}

export function getInternalInstanceDomain() {
	return 'cloudflare-worker'
}

export function getInstanceInfoSync() {
	return {
		currentInstance: 'cloudflare-worker',
		primaryInstance: 'cloudflare-worker',
		currentIsPrimary: true,
	}
}

export async function ensurePrimary() {}

export async function ensureInstance(_instance?: string) {}
