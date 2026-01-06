import { type SSOConfiguration } from '@repo/database/types'
import { type OAuth2Strategy } from 'remix-auth-oauth2'
import { type ProviderUser } from '../providers/provider.ts'

/**
 * In-memory cache for SSO configurations and strategies
 * Implements LRU eviction policy to manage memory usage
 */
export class SSOCache {
	private configCache = new Map<
		string,
		{ config: SSOConfiguration; timestamp: number }
	>()
	private strategyCache = new Map<
		string,
		{ strategy: OAuth2Strategy<ProviderUser>; timestamp: number }
	>()
	private endpointCache = new Map<
		string,
		{ endpoints: any; timestamp: number }
	>()

	// Cache configuration
	private readonly maxCacheSize = 100
	private readonly configTTL = 5 * 60 * 1000 // 5 minutes
	private readonly strategyTTL = 10 * 60 * 1000 // 10 minutes
	private readonly endpointTTL = 30 * 60 * 1000 // 30 minutes

	/**
	 * Get cached SSO configuration
	 */
	getConfiguration(organizationId: string): SSOConfiguration | null {
		const cached = this.configCache.get(organizationId)
		if (!cached) return null

		// Check if cache entry is expired
		if (Date.now() - cached.timestamp > this.configTTL) {
			this.configCache.delete(organizationId)
			return null
		}

		return cached.config
	}

	/**
	 * Cache SSO configuration
	 */
	setConfiguration(organizationId: string, config: SSOConfiguration): void {
		// Implement LRU eviction if cache is full
		if (this.configCache.size >= this.maxCacheSize) {
			this.evictOldestConfig()
		}

		this.configCache.set(organizationId, {
			config,
			timestamp: Date.now(),
		})
	}

	/**
	 * Get cached OAuth2 strategy
	 */
	getStrategy(organizationId: string): OAuth2Strategy<ProviderUser> | null {
		const cached = this.strategyCache.get(organizationId)
		if (!cached) return null

		// Check if cache entry is expired
		if (Date.now() - cached.timestamp > this.strategyTTL) {
			this.strategyCache.delete(organizationId)
			return null
		}

		return cached.strategy
	}

	/**
	 * Cache OAuth2 strategy
	 */
	setStrategy(
		organizationId: string,
		strategy: OAuth2Strategy<ProviderUser>,
	): void {
		// Implement LRU eviction if cache is full
		if (this.strategyCache.size >= this.maxCacheSize) {
			this.evictOldestStrategy()
		}

		this.strategyCache.set(organizationId, {
			strategy,
			timestamp: Date.now(),
		})
	}

	/**
	 * Get cached OIDC endpoints
	 */
	getEndpoints(issuerUrl: string): any | null {
		const cached = this.endpointCache.get(issuerUrl)
		if (!cached) return null

		// Check if cache entry is expired
		if (Date.now() - cached.timestamp > this.endpointTTL) {
			this.endpointCache.delete(issuerUrl)
			return null
		}

		return cached.endpoints
	}

	/**
	 * Cache OIDC endpoints
	 */
	setEndpoints(issuerUrl: string, endpoints: any): void {
		// Implement LRU eviction if cache is full
		if (this.endpointCache.size >= this.maxCacheSize) {
			this.evictOldestEndpoint()
		}

		this.endpointCache.set(issuerUrl, {
			endpoints,
			timestamp: Date.now(),
		})
	}

	/**
	 * Invalidate configuration cache for an organization
	 */
	invalidateConfiguration(organizationId: string): void {
		this.configCache.delete(organizationId)
		this.strategyCache.delete(organizationId)
	}

	/**
	 * Invalidate endpoint cache for an issuer
	 */
	invalidateEndpoints(issuerUrl: string): void {
		this.endpointCache.delete(issuerUrl)
	}

	/**
	 * Clear all caches
	 */
	clearAll(): void {
		this.configCache.clear()
		this.strategyCache.clear()
		this.endpointCache.clear()
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		configs: { size: number; maxSize: number }
		strategies: { size: number; maxSize: number }
		endpoints: { size: number; maxSize: number }
	} {
		return {
			configs: {
				size: this.configCache.size,
				maxSize: this.maxCacheSize,
			},
			strategies: {
				size: this.strategyCache.size,
				maxSize: this.maxCacheSize,
			},
			endpoints: {
				size: this.endpointCache.size,
				maxSize: this.maxCacheSize,
			},
		}
	}

	/**
	 * Evict oldest configuration entry (LRU)
	 */
	private evictOldestConfig(): void {
		let oldestKey: string | null = null
		let oldestTimestamp = Date.now()

		for (const [key, value] of this.configCache.entries()) {
			if (value.timestamp < oldestTimestamp) {
				oldestTimestamp = value.timestamp
				oldestKey = key
			}
		}

		if (oldestKey) {
			this.configCache.delete(oldestKey)
		}
	}

	/**
	 * Evict oldest strategy entry (LRU)
	 */
	private evictOldestStrategy(): void {
		let oldestKey: string | null = null
		let oldestTimestamp = Date.now()

		for (const [key, value] of this.strategyCache.entries()) {
			if (value.timestamp < oldestTimestamp) {
				oldestTimestamp = value.timestamp
				oldestKey = key
			}
		}

		if (oldestKey) {
			this.strategyCache.delete(oldestKey)
		}
	}

	/**
	 * Evict oldest endpoint entry (LRU)
	 */
	private evictOldestEndpoint(): void {
		let oldestKey: string | null = null
		let oldestTimestamp = Date.now()

		for (const [key, value] of this.endpointCache.entries()) {
			if (value.timestamp < oldestTimestamp) {
				oldestTimestamp = value.timestamp
				oldestKey = key
			}
		}

		if (oldestKey) {
			this.endpointCache.delete(oldestKey)
		}
	}
}

// Export singleton instance
export const ssoCache = new SSOCache()
