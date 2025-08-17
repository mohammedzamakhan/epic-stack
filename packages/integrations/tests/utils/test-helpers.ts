/**
 * Test helper functions and utilities
 */

import { vi } from 'vitest'
import {
	type Integration,
	type NoteIntegrationConnection,
} from '@prisma/client'
import { BaseIntegrationProvider } from '../../src/provider'
import {
	type TokenData,
	type Channel,
	type MessageData,
	type OAuthCallbackParams,
	type ProviderType,
} from '../../src/types'
import { fixtures } from './fixtures'

/**
 * Mock provider implementation for testing
 */
export class MockProvider extends BaseIntegrationProvider {
	readonly name = 'mock'
	readonly type: ProviderType = 'productivity'
	readonly displayName = 'Mock Provider'
	readonly description = 'Mock provider for testing'
	readonly logoPath = '/icons/mock.svg'

	// Mock implementations with vi.fn() for tracking calls
	getAuthUrl = vi
		.fn()
		.mockResolvedValue('https://mock.com/oauth/authorize?state=test')
	handleCallback = vi.fn().mockResolvedValue(fixtures.testData.tokenData)
	refreshToken = vi.fn().mockResolvedValue(fixtures.testData.tokenData)
	getAvailableChannels = vi.fn().mockResolvedValue([
		{
			id: 'mock-channel-1',
			name: 'Mock Channel 1',
			type: 'public' as const,
			metadata: { test: true },
		},
	])
	postMessage = vi.fn().mockResolvedValue(undefined)
	validateConnection = vi.fn().mockResolvedValue(true)
	getConfigSchema = vi.fn().mockReturnValue({
		type: 'object',
		properties: {
			testProperty: { type: 'string' },
		},
	})
}

/**
 * Mock integration repository for testing
 */
export class MockIntegrationRepository {
	private integrations = new Map<string, Integration>()

	constructor(initialData: Integration[] = []) {
		initialData.forEach((integration) => {
			this.integrations.set(integration.id, integration)
		})
	}

	async findById(id: string): Promise<Integration | null> {
		return this.integrations.get(id) || null
	}

	async findByOrganizationId(organizationId: string): Promise<Integration[]> {
		return Array.from(this.integrations.values()).filter(
			(integration) => integration.organizationId === organizationId,
		)
	}

	async create(
		data: Omit<Integration, 'id' | 'createdAt' | 'updatedAt'>,
	): Promise<Integration> {
		const integration: Integration = {
			...data,
			id: `mock-integration-${Date.now()}`,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		this.integrations.set(integration.id, integration)
		return integration
	}

	async update(id: string, data: Partial<Integration>): Promise<Integration> {
		const existing = this.integrations.get(id)
		if (!existing) {
			throw new Error(`Integration ${id} not found`)
		}
		const updated = { ...existing, ...data, updatedAt: new Date() }
		this.integrations.set(id, updated)
		return updated
	}

	async delete(id: string): Promise<void> {
		this.integrations.delete(id)
	}

	// Helper methods for testing
	clear(): void {
		this.integrations.clear()
	}

	getAll(): Integration[] {
		return Array.from(this.integrations.values())
	}
}

/**
 * Mock connection repository for testing
 */
export class MockConnectionRepository {
	private connections = new Map<string, NoteIntegrationConnection>()

	constructor(initialData: NoteIntegrationConnection[] = []) {
		initialData.forEach((connection) => {
			this.connections.set(connection.id, connection)
		})
	}

	async findById(id: string): Promise<NoteIntegrationConnection | null> {
		return this.connections.get(id) || null
	}

	async findByNoteId(noteId: string): Promise<NoteIntegrationConnection[]> {
		return Array.from(this.connections.values()).filter(
			(connection) => connection.noteId === noteId,
		)
	}

	async create(
		data: Omit<NoteIntegrationConnection, 'id' | 'createdAt' | 'updatedAt'>,
	): Promise<NoteIntegrationConnection> {
		const connection: NoteIntegrationConnection = {
			...data,
			id: `mock-connection-${Date.now()}`,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		this.connections.set(connection.id, connection)
		return connection
	}

	async update(
		id: string,
		data: Partial<NoteIntegrationConnection>,
	): Promise<NoteIntegrationConnection> {
		const existing = this.connections.get(id)
		if (!existing) {
			throw new Error(`Connection ${id} not found`)
		}
		const updated = { ...existing, ...data, updatedAt: new Date() }
		this.connections.set(id, updated)
		return updated
	}

	async delete(id: string): Promise<void> {
		this.connections.delete(id)
	}

	// Helper methods for testing
	clear(): void {
		this.connections.clear()
	}

	getAll(): NoteIntegrationConnection[] {
		return Array.from(this.connections.values())
	}
}

/**
 * Create a test integration instance
 */
export function createTestIntegration(
	overrides: Partial<Integration> = {},
): Integration {
	return {
		...fixtures.testData.integration,
		...overrides,
	}
}

/**
 * Create a test connection instance
 */
export function createTestConnection(
	overrides: Partial<NoteIntegrationConnection> = {},
): NoteIntegrationConnection {
	return {
		...fixtures.testData.connection,
		...overrides,
	}
}

/**
 * Create test message data
 */
export function createTestMessage(
	overrides: Partial<MessageData> = {},
): MessageData {
	return {
		...fixtures.testData.messageData,
		...overrides,
	}
}

/**
 * Create test OAuth callback params
 */
export function createTestOAuthParams(
	overrides: Partial<OAuthCallbackParams> = {},
): OAuthCallbackParams {
	return {
		...fixtures.testData.oauthCallbackParams,
		...overrides,
	}
}

/**
 * Create test token data
 */
export function createTestTokenData(
	overrides: Partial<TokenData> = {},
): TokenData {
	return {
		...fixtures.testData.tokenData,
		...overrides,
	}
}

/**
 * Create test channels
 */
export function createTestChannels(count: number = 2): Channel[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `channel-${i + 1}`,
		name: `Test Channel ${i + 1}`,
		type: i % 2 === 0 ? ('public' as const) : ('private' as const),
		metadata: { index: i },
	}))
}

/**
 * Mock encryption functions for testing
 */
export const mockEncryption = {
	encryptToken: vi
		.fn()
		.mockImplementation((token: string) => `encrypted-${token}`),
	decryptToken: vi
		.fn()
		.mockImplementation((encryptedToken: string) =>
			encryptedToken.replace('encrypted-', ''),
		),
}

/**
 * Mock OAuth state manager for testing
 */
export const mockOAuthStateManager = {
	generateState: vi.fn().mockReturnValue('mock-oauth-state'),
	validateState: vi.fn().mockReturnValue({
		organizationId: 'org-123',
		providerName: 'test',
		timestamp: Date.now(),
	}),
}

/**
 * Setup test environment with common mocks
 */
export function setupTestEnvironment() {
	// Mock console methods
	vi.spyOn(console, 'log').mockImplementation(() => {})
	vi.spyOn(console, 'warn').mockImplementation(() => {})
	vi.spyOn(console, 'error').mockImplementation(() => {})
	vi.spyOn(console, 'info').mockImplementation(() => {})
	vi.spyOn(console, 'debug').mockImplementation(() => {})

	// Mock Date.now for consistent timestamps
	const mockDate = new Date('2024-01-01T00:00:00.000Z')
	vi.useFakeTimers()
	vi.setSystemTime(mockDate)

	return {
		mockDate,
		cleanup: () => {
			vi.useRealTimers()
			vi.restoreAllMocks()
		},
	}
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Assert that a function throws with a specific message
 */
export async function expectToThrow(
	fn: () => Promise<any> | any,
	expectedMessage?: string | RegExp,
): Promise<Error> {
	try {
		await fn()
		throw new Error('Expected function to throw, but it did not')
	} catch (error) {
		if (expectedMessage) {
			if (typeof expectedMessage === 'string') {
				if ((error as Error).message !== expectedMessage) {
					throw new Error(
						`Expected error message "${expectedMessage}" but got "${(error as Error).message}"`,
					)
				}
			} else {
				if (!expectedMessage.test((error as Error).message)) {
					throw new Error(
						`Expected error message to match ${expectedMessage} but got "${(error as Error).message}"`,
					)
				}
			}
		}
		return error as Error
	}
}
