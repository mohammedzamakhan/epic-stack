import { vi } from 'vitest'

type QueryResult = unknown[]

export function queryChain(rows: QueryResult = []): any {
	const chain: Record<string, any> = {
		from: () => chain,
		where: () => chain,
		limit: () => chain,
		orderBy: () => chain,
		innerJoin: () => chain,
		leftJoin: () => chain,
		values: () => chain,
		set: () => chain,
		returning: () => chain,
		onConflictDoUpdate: () => chain,
		onConflictDoNothing: () => chain,
		// oxlint-disable-next-line unicorn/no-thenable
		then: (
			resolve: (value: QueryResult) => unknown,
			reject?: (error: unknown) => unknown,
		) => Promise.resolve(rows).then(resolve, reject),
	}
	return chain
}

export const mockDb = {
	select: vi.fn(() => queryChain()),
	insert: vi.fn(() => queryChain()),
	update: vi.fn(() => queryChain()),
	delete: vi.fn(() => queryChain()),
	transaction: vi.fn(async (callback: (tx: typeof mockDb) => unknown) =>
		callback(mockDb),
	),
}

export function resetMockDb() {
	vi.clearAllMocks()
	mockDb.select.mockImplementation(() => queryChain())
	mockDb.insert.mockImplementation(() => queryChain())
	mockDb.update.mockImplementation(() => queryChain())
	mockDb.delete.mockImplementation(() => queryChain())
	mockDb.transaction.mockImplementation(async (callback) => callback(mockDb))
}

export function mockSelectResults(...results: unknown[][]) {
	let index = 0
	mockDb.select.mockImplementation(() => {
		const rows = results[Math.min(index, results.length - 1)] ?? []
		index += 1
		return queryChain(rows)
	})
}

export function mockInsertReturning(...results: unknown[][]) {
	let index = 0
	mockDb.insert.mockImplementation(() => {
		const rows = results[Math.min(index, results.length - 1)] ?? []
		index += 1
		return queryChain(rows)
	})
}

export function mockUpdateReturning(...results: unknown[][]) {
	let index = 0
	mockDb.update.mockImplementation(() => {
		const rows = results[Math.min(index, results.length - 1)] ?? []
		index += 1
		return queryChain(rows)
	})
}

export function captureInserts(...returningResults: unknown[][]) {
	const insertedValues: unknown[] = []
	let index = 0
	mockDb.insert.mockImplementation(() => {
		const rows =
			returningResults[Math.min(index, returningResults.length - 1)] ?? []
		index += 1
		const chain = queryChain(rows)
		const baseValues = chain.values
		chain.values = (vals: unknown) => {
			insertedValues.push(vals)
			return baseValues(vals)
		}
		return chain
	})
	return { insertedValues }
}

export const drizzleTable = new Proxy({}, { get: (_, property) => property })

export function drizzleOperator(...args: unknown[]) {
	return args
}
