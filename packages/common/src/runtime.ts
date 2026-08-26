export function isCloudflareWorkerRuntime(): boolean {
	const workerCaches = (globalThis as { caches?: { default?: unknown } }).caches
	return workerCaches !== undefined && 'default' in workerCaches
}
