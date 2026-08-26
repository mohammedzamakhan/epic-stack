/** Cloudflare build stub — cache uses KV on Workers, not node:sqlite. */
export class DatabaseSync {
	exec(_sql?: string) {}
	prepare(_sql: string) {
		return {
			get() {
				return undefined
			},
			run() {},
			all() {
				return []
			},
		}
	}
	close() {}
}

export type StatementSync = ReturnType<DatabaseSync['prepare']>
