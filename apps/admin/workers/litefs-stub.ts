const LOCAL_INSTANCE = 'local'

export async function getInstanceInfo() {
	return {
		currentInstance: LOCAL_INSTANCE,
		primaryInstance: LOCAL_INSTANCE,
		currentIsPrimary: true,
	}
}

export function getInstanceInfoSync() {
	return {
		currentInstance: LOCAL_INSTANCE,
		primaryInstance: LOCAL_INSTANCE,
		currentIsPrimary: true,
	}
}

export async function getAllInstances() {
	return { [LOCAL_INSTANCE]: 'cloudflare' } as Record<string, string>
}

export function getInternalInstanceDomain(instance: string) {
	return instance
}

export async function ensurePrimary() {}

export async function ensureInstance(_instance: string) {}
