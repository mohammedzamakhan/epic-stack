export type FetcherService = {
	fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}

let boundService: FetcherService | null = null

export function bindTenantApiService(service?: FetcherService | null) {
	boundService = service ?? null
}

export function getBoundTenantApiService(): FetcherService | null {
	return boundService
}
