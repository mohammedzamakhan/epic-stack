// Instance info utilities for Cloudflare Workers
import { isCloudflareWorkerRuntime } from './runtime.ts'

export type InstanceInfo = {
	primaryInstance: string
	currentInstance: string
	currentIsPrimary: boolean
}

const LOCAL_INSTANCE_INFO: InstanceInfo = {
	currentInstance: 'local',
	primaryInstance: 'local',
	currentIsPrimary: true,
}

// Detect if running in Cloudflare Workers
function isCloudflareProduction(): boolean {
	return isCloudflareWorkerRuntime()
}

export async function getInstanceInfo(
	litefsDir?: string,
): Promise<InstanceInfo> {
	// Cloudflare Workers - D1 handles database
	return LOCAL_INSTANCE_INFO
}

export function getInstanceInfoSync(litefsDir?: string): InstanceInfo {
	return LOCAL_INSTANCE_INFO
}

export async function getAllInstances(): Promise<
	Record<string, string | string[]>
> {
	// Cloudflare Workers - single instance
	return { local: 'local' }
}

export function getInternalInstanceDomain(
	instance: string,
	port?: string | void,
): string {
	// Cloudflare Workers - use Workers internal routing
	if (isCloudflareProduction()) return `https://${instance}.workers.dev`
	return `http://${instance}.local:8081`
}

export async function ensurePrimary(): Promise<boolean> {
	// Cloudflare Workers - always primary (single instance model)
	return true
}

export async function ensureInstance(instance: string): Promise<true> {
	// Cloudflare Workers - single instance, no need to ensure
	return true
}
