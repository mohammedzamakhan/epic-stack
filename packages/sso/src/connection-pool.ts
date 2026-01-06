/**
 * Connection pool for identity provider requests
 * Manages HTTP connections to reduce latency and improve performance
 */

import { type ConnectionPoolStats } from './types.ts'

interface ConnectionPoolEntry {
	baseUrl: string
	totalRequests: number
	errorCount: number
	lastUsed: number
	createdAt: number
}

export class SSOConnectionPool {
	private pools = new Map<string, ConnectionPoolEntry>()
	private readonly maxPoolSize = 10
	private readonly connectionTimeout = 30000 // 30 seconds
	private readonly idleTimeout = 60000 // 1 minute

	/**
	 * Get or create a connection pool for an identity provider
	 */
	async getConnection(baseUrl: string): Promise<ConnectionPoolEntry> {
		const poolKey = this.getPoolKey(baseUrl)

		let pool = this.pools.get(poolKey)
		if (!pool) {
			pool = this.createPool(baseUrl)
			this.pools.set(poolKey, pool)
		}

		// Clean up idle connections
		this.cleanupIdleConnections(pool)

		return pool
	}

	/**
	 * Make an HTTP request using the connection pool
	 */
	async request(url: string, options: RequestInit = {}): Promise<Response> {
		const baseUrl = this.extractBaseUrl(url)
		const pool = await this.getConnection(baseUrl)

		// Add connection pooling headers
		const headers = new Headers(options.headers)
		headers.set('Connection', 'keep-alive')
		headers.set('Keep-Alive', 'timeout=30, max=100')

		// Add timeout if not specified
		const controller = new AbortController()
		const timeoutId = setTimeout(
			() => controller.abort(),
			this.connectionTimeout,
		)

		try {
			const response = await fetch(url, {
				...options,
				headers,
				signal: options.signal || controller.signal,
			})

			// Update pool statistics
			pool.totalRequests++
			pool.lastUsed = Date.now()

			return response
		} catch (error) {
			pool.errorCount++
			throw error
		} finally {
			clearTimeout(timeoutId)
		}
	}

	/**
	 * Get connection pool statistics
	 */
	getPoolStats(): Record<string, ConnectionPoolStats> {
		const stats: Record<string, ConnectionPoolStats> = {}

		for (const [key, pool] of this.pools.entries()) {
			stats[key] = {
				baseUrl: pool.baseUrl,
				totalRequests: pool.totalRequests,
				errorCount: pool.errorCount,
				lastUsed: pool.lastUsed,
				createdAt: pool.createdAt,
			}
		}

		return stats
	}

	/**
	 * Clear all connection pools
	 */
	clearPools(): void {
		this.pools.clear()
	}

	/**
	 * Clean up idle connection pools
	 */
	cleanupIdlePools(): void {
		const now = Date.now()
		const keysToDelete: string[] = []

		for (const [key, pool] of this.pools.entries()) {
			if (now - pool.lastUsed > this.idleTimeout) {
				keysToDelete.push(key)
			}
		}

		for (const key of keysToDelete) {
			this.pools.delete(key)
		}
	}

	/**
	 * Create a new connection pool entry
	 */
	private createPool(baseUrl: string): ConnectionPoolEntry {
		return {
			baseUrl,
			totalRequests: 0,
			errorCount: 0,
			lastUsed: Date.now(),
			createdAt: Date.now(),
		}
	}

	/**
	 * Generate pool key from base URL
	 */
	private getPoolKey(baseUrl: string): string {
		try {
			const url = new URL(baseUrl)
			return `${url.protocol}//${url.host}`
		} catch {
			return baseUrl
		}
	}

	/**
	 * Extract base URL from full URL
	 */
	private extractBaseUrl(url: string): string {
		try {
			const urlObj = new URL(url)
			return `${urlObj.protocol}//${urlObj.host}`
		} catch {
			return url
		}
	}

	/**
	 * Clean up idle connections for a specific pool
	 */
	private cleanupIdleConnections(pool: ConnectionPoolEntry): void {
		const now = Date.now()
		if (now - pool.lastUsed > this.idleTimeout) {
			// Reset pool statistics for idle pools
			pool.totalRequests = 0
			pool.errorCount = 0
			pool.lastUsed = now
		}
	}
}

/**
 * Create a new SSO connection pool instance
 */
export function createConnectionPool(): SSOConnectionPool {
	return new SSOConnectionPool()
}
