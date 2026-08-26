export function isCloudflareWorkerRuntime() {
	return typeof caches !== 'undefined' && 'default' in caches
}
