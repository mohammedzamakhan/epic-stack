import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
	cachified as baseCachified,
	verboseReporter,
	mergeReporters,
	type CacheEntry,
	type Cache as CachifiedCache,
	type CachifiedOptions,
	type Cache,
	totalTtl,
	type CreateReporter,
} from '@epic-web/cachified'
import { remember } from '@epic-web/remember'
import { LRUCache } from 'lru-cache'
import { z } from 'zod'
import { cachifiedTimingReporter, type Timings } from '@repo/common'

const CACHE_DATABASE_PATH = process.env.CACHE_DATABASE_PATH ?? './cache.db'

const cacheDb = remember('cacheDb', createDatabase)

function createDatabase(tryAgain = true): DatabaseSync {
	const parentDir = path.dirname(CACHE_DATABASE_PATH)
	fs.mkdirSync(parentDir, { recursive: true })

	const db = new DatabaseSync(CACHE_DATABASE_PATH)

	try {
		// create cache table with metadata JSON column and value JSON column if it does not exist already
		db.exec(`
			CREATE TABLE IF NOT EXISTS cache (
				key TEXT PRIMARY KEY,
				metadata TEXT,
				value TEXT
			)
		`)
	} catch (error: unknown) {
		fs.unlinkSync(CACHE_DATABASE_PATH)
		if (tryAgain) {
			console.error(
				`Error creating cache database, deleting the file at "${CACHE_DATABASE_PATH}" and trying again...`,
			)
			return createDatabase(false)
		}
		throw error
	}

	return db
}

const lru = remember(
	'lru-cache',
	() => new LRUCache<string, CacheEntry<unknown>>({ max: 5000 }),
)

export const lruCache = {
	name: 'app-memory-cache',
	set: (key, value) => {
		const ttl = totalTtl(value?.metadata)
		lru.set(key, value, {
			ttl: ttl === Infinity ? undefined : ttl,
			start: value?.metadata?.createdTime,
		})
		return value
	},
	get: (key) => lru.get(key),
	delete: (key) => lru.delete(key),
} satisfies Cache

const isBuffer = (obj: unknown): obj is Buffer =>
	Buffer.isBuffer(obj) || obj instanceof Uint8Array

function bufferReplacer(_key: string, value: unknown) {
	if (isBuffer(value)) {
		return {
			__isBuffer: true,
			data: value.toString('base64'),
		}
	}
	return value
}

function bufferReviver(_key: string, value: unknown) {
	if (
		value &&
		typeof value === 'object' &&
		'__isBuffer' in value &&
		(value as any).data
	) {
		return Buffer.from((value as any).data, 'base64')
	}
	return value
}

const cacheEntrySchema = z.object({
	metadata: z.object({
		createdTime: z.number(),
		ttl: z.number().nullable().optional(),
		swr: z.number().nullable().optional(),
	}),
	value: z.unknown(),
})
const cacheQueryResultSchema = z.object({
	metadata: z.string(),
	value: z.string(),
})

const getStatement = cacheDb.prepare(
	'SELECT value, metadata FROM cache WHERE key = ?',
)
const setStatement = cacheDb.prepare(
	'INSERT OR REPLACE INTO cache (key, value, metadata) VALUES (?, ?, ?)',
)
const deleteStatement = cacheDb.prepare('DELETE FROM cache WHERE key = ?')
const getAllKeysStatement = cacheDb.prepare('SELECT key FROM cache LIMIT ?')
const searchKeysStatement = cacheDb.prepare(
	'SELECT key FROM cache WHERE key LIKE ? LIMIT ?',
)

export const cache: CachifiedCache = {
	name: 'SQLite cache',
	async get(key) {
		const result = getStatement.get(key)
		const parseResult = cacheQueryResultSchema.safeParse(result)
		if (!parseResult.success) return null

		const parsedEntry = cacheEntrySchema.safeParse({
			metadata: JSON.parse(parseResult.data.metadata),
			value: JSON.parse(parseResult.data.value, bufferReviver),
		})
		if (!parsedEntry.success) return null
		const { metadata, value } = parsedEntry.data
		if (!value) return null
		return { metadata, value }
	},
	async set(key, entry) {
		const value = JSON.stringify(entry.value, bufferReplacer)
		setStatement.run(key, value, JSON.stringify(entry.metadata))
	},
	async delete(key) {
		deleteStatement.run(key)
	},
}

// Enhanced cache statistics queries
const getCacheStatsStatement = cacheDb.prepare(`
	SELECT
		COUNT(*) as totalKeys,
		SUM(LENGTH(value)) as totalSize
	FROM cache
`)

const getCacheKeyDetailsStatement = cacheDb.prepare(`
	SELECT
		key,
		LENGTH(value) as size,
		metadata
	FROM cache
	WHERE key = ?
`)

const getAllCacheKeysWithDetailsStatement = cacheDb.prepare(`
	SELECT
		key,
		LENGTH(value) as size,
		metadata
	FROM cache
	ORDER BY key
	LIMIT ?
`)

const searchCacheKeysWithDetailsStatement = cacheDb.prepare(`
	SELECT
		key,
		LENGTH(value) as size,
		metadata
	FROM cache
	WHERE key LIKE ?
	ORDER BY key
	LIMIT ?
`)

export interface CacheKeyInfo {
	key: string
	size: number
	createdAt?: Date
	ttl?: number | null
	swr?: number | null
}

export interface CacheStats {
	sqlite: {
		totalKeys: number
		totalSize: number
		averageSize: number
	}
	lru: {
		totalKeys: number
		maxSize: number
		currentSize: number
	}
}

export async function getCacheStats(): Promise<CacheStats> {
	// SQLite cache stats
	const sqliteStats = getCacheStatsStatement.get() as {
		totalKeys: number
		totalSize: number
	}

	// LRU cache stats
	const lruKeys = [...lru.keys()]
	const lruSize = lru.size
	const lruMaxSize = lru.max || 0

	return {
		sqlite: {
			totalKeys: sqliteStats.totalKeys || 0,
			totalSize: sqliteStats.totalSize || 0,
			averageSize:
				sqliteStats.totalKeys > 0
					? Math.round((sqliteStats.totalSize || 0) / sqliteStats.totalKeys)
					: 0,
		},
		lru: {
			totalKeys: lruKeys.length,
			maxSize: lruMaxSize,
			currentSize: lruSize,
		},
	}
}

export async function getAllCacheKeys(limit: number) {
	return {
		sqlite: getAllKeysStatement
			.all(limit)
			.map((row) => (row as { key: string }).key),
		lru: [...lru.keys()],
	}
}

export async function getAllCacheKeysWithDetails(limit: number): Promise<{
	sqlite: CacheKeyInfo[]
	lru: CacheKeyInfo[]
}> {
	// Get SQLite cache keys with details
	const sqliteRows = getAllCacheKeysWithDetailsStatement.all(limit) as Array<{
		key: string
		size: number
		metadata: string
	}>

	const sqliteKeys: CacheKeyInfo[] = sqliteRows.map((row) => {
		let metadata: any = {}
		try {
			metadata = JSON.parse(row.metadata)
		} catch {
			// ignore parse errors
		}

		return {
			key: row.key,
			size: row.size,
			createdAt: metadata.createdTime
				? new Date(metadata.createdTime)
				: undefined,
			ttl: metadata.ttl,
			swr: metadata.swr,
		}
	})

	// Get LRU cache keys with details
	const lruKeys: CacheKeyInfo[] = [...lru.keys()].slice(0, limit).map((key) => {
		const entry = lru.get(key)
		return {
			key,
			size: 0, // LRU doesn't track size easily
			createdAt: entry?.metadata?.createdTime
				? new Date(entry.metadata.createdTime)
				: undefined,
			ttl: entry?.metadata?.ttl,
			swr: entry?.metadata?.swr,
		}
	})

	return {
		sqlite: sqliteKeys,
		lru: lruKeys,
	}
}

export async function searchCacheKeys(search: string, limit: number) {
	return {
		sqlite: searchKeysStatement
			.all(`%${search}%`, limit)
			.map((row) => (row as { key: string }).key),
		lru: [...lru.keys()].filter((key) => key.includes(search)),
	}
}

export async function searchCacheKeysWithDetails(
	search: string,
	limit: number,
): Promise<{
	sqlite: CacheKeyInfo[]
	lru: CacheKeyInfo[]
}> {
	// Get SQLite cache keys with details
	const sqliteRows = searchCacheKeysWithDetailsStatement.all(
		`%${search}%`,
		limit,
	) as Array<{
		key: string
		size: number
		metadata: string
	}>

	const sqliteKeys: CacheKeyInfo[] = sqliteRows.map((row) => {
		let metadata: any = {}
		try {
			metadata = JSON.parse(row.metadata)
		} catch {
			// ignore parse errors
		}

		return {
			key: row.key,
			size: row.size,
			createdAt: metadata.createdTime
				? new Date(metadata.createdTime)
				: undefined,
			ttl: metadata.ttl,
			swr: metadata.swr,
		}
	})

	// Get LRU cache keys with details
	const lruKeys: CacheKeyInfo[] = [...lru.keys()]
		.filter((key) => key.includes(search))
		.slice(0, limit)
		.map((key) => {
			const entry = lru.get(key)
			return {
				key,
				size: 0, // LRU doesn't track size easily
				createdAt: entry?.metadata?.createdTime
					? new Date(entry.metadata.createdTime)
					: undefined,
				ttl: entry?.metadata?.ttl,
				swr: entry?.metadata?.swr,
			}
		})

	return {
		sqlite: sqliteKeys,
		lru: lruKeys,
	}
}

export async function getCacheKeyDetails(
	key: string,
	type: 'sqlite' | 'lru',
): Promise<CacheKeyInfo | null> {
	if (type === 'sqlite') {
		const row = getCacheKeyDetailsStatement.get(key) as
			| { key: string; size: number; metadata: string }
			| undefined
		if (!row) return null

		let metadata: any = {}
		try {
			metadata = JSON.parse(row.metadata)
		} catch {
			// ignore parse errors
		}

		return {
			key: row.key,
			size: row.size,
			createdAt: metadata.createdTime
				? new Date(metadata.createdTime)
				: undefined,
			ttl: metadata.ttl,
			swr: metadata.swr,
		}
	} else {
		const entry = lru.get(key)
		if (!entry) return null

		return {
			key,
			size: 0, // LRU doesn't track size easily
			createdAt: entry.metadata?.createdTime
				? new Date(entry.metadata.createdTime)
				: undefined,
			ttl: entry.metadata?.ttl,
			swr: entry.metadata?.swr,
		}
	}
}

// Bulk operations
export async function clearCacheByType(
	type: 'sqlite' | 'lru',
): Promise<number> {
	if (type === 'sqlite') {
		const result = cacheDb.prepare('DELETE FROM cache').run()
		return Number(result.changes) || 0
	} else {
		const count = lru.size
		lru.clear()
		return count
	}
}

export async function deleteCacheKeys(
	keys: string[],
	type: 'sqlite' | 'lru',
): Promise<number> {
	let deletedCount = 0

	if (type === 'sqlite') {
		const deleteStmt = cacheDb.prepare('DELETE FROM cache WHERE key = ?')
		for (const key of keys) {
			const result = deleteStmt.run(key)
			if (result.changes && result.changes > 0) {
				deletedCount++
			}
		}
	} else {
		for (const key of keys) {
			if (lru.delete(key)) {
				deletedCount++
			}
		}
	}

	return deletedCount
}

export async function cachified<Value>(
	{
		timings,
		...options
	}: CachifiedOptions<Value> & {
		timings?: Timings
	},
	reporter: CreateReporter<Value> = verboseReporter<Value>(),
): Promise<Value> {
	return baseCachified(
		options,
		mergeReporters(cachifiedTimingReporter(timings), reporter),
	)
}

// Cache invalidation helpers for user-related data
export async function invalidateUserCache(userId: string) {
	await Promise.all([
		cache.delete(`user:${userId}`),
		cache.delete(`user-security:${userId}`),
		lruCache.delete(`user:${userId}`),
		lruCache.delete(`user-security:${userId}`),
	])
}

export async function invalidateUserOrganizationsCache(userId: string) {
	await Promise.all([
		cache.delete(`user-organizations:${userId}`),
		lruCache.delete(`user-organizations:${userId}`),
	])
}

export async function invalidateUserSecurityCache(userId: string) {
	await Promise.all([
		cache.delete(`user-security:${userId}`),
		lruCache.delete(`user-security:${userId}`),
	])
}

export async function invalidateUserFavoritesCache(userId: string) {
	await Promise.all([
		cache.delete(`user-favorites:${userId}`),
		lruCache.delete(`user-favorites:${userId}`),
	])
}
