import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IntegrationService } from '../../src/service'
import { integrationManager } from '../../src/integration-manager'
import type { OrganizationNote } from '../../src/types'

vi.mock('../../src/integration-manager', () => ({
	integrationManager: {
		initiateOAuth: vi.fn(),
		handleOAuthCallback: vi.fn(),
		getAvailableChannels: vi.fn(),
		connectNoteToChannel: vi.fn(),
		disconnectNoteFromChannel: vi.fn(),
		handleNoteUpdate: vi.fn(),
		refreshIntegrationTokens: vi.fn(),
		validateIntegrationConnections: vi.fn(),
		getIntegrationStatus: vi.fn(),
		disconnectIntegration: vi.fn(),
		getOrganizationIntegrations: vi.fn(),
		getNoteConnections: vi.fn(),
		logIntegrationActivity: vi.fn(),
		registerProvider: vi.fn(),
		getProvider: vi.fn(),
		getAllProviders: vi.fn(),
		getProvidersByType: vi.fn(),
		getIntegration: vi.fn(),
		getIntegrationConnections: vi.fn(),
		getIntegrationStats: vi.fn(),
		updateIntegrationConfig: vi.fn(),
	},
}))

vi.mock('../../src/oauth-manager', () => ({
	TokenRefreshManager: {
		shouldRefreshToken: vi.fn(),
		isTokenExpired: vi.fn(),
	},
}))

describe('IntegrationService Edge Cases', () => {
	let service: IntegrationService

	beforeEach(() => {
		service = new IntegrationService()
		vi.clearAllMocks()
	})

	describe('formatNoteMessage edge cases', () => {
		it('should handle note with exactly 500 characters of content', () => {
			const content = 'a'.repeat(500)
			const note: OrganizationNote = {
				id: 'note-500',
				title: 'Exact Length Note',
				content: content,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User' }

			const result = service.formatNoteMessage(note, 'created', author)

			expect(result.content).toHaveLength(500)
			expect(result.content).toBe(content)
			expect(result.content.endsWith('...')).toBe(false)
		})

		it('should handle note with 501 characters of content', () => {
			const content = 'a'.repeat(501)
			const note: OrganizationNote = {
				id: 'note-501',
				title: 'Just Over Limit',
				content: content,
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User' }

			const result = service.formatNoteMessage(note, 'created', author)

			expect(result.content).toHaveLength(500)
			expect(result.content.endsWith('...')).toBe(true)
		})

		it('should handle note with very long title', () => {
			const longTitle = 'Very Long Title ' + 'x'.repeat(500)
			const note: OrganizationNote = {
				id: 'note-long-title',
				title: longTitle,
				content: 'Short content',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User' }

			const result = service.formatNoteMessage(note, 'updated', author)

			expect(result.title).toBe(longTitle)
			expect(result.changeType).toBe('updated')
		})

		it('should handle note with special characters in title and content', () => {
			const note: OrganizationNote = {
				id: 'note-special',
				title: 'Title with <tags> & "quotes" and \'apostrophes\'',
				content: 'Content with\nnewlines\tand\ttabs',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test & User <script>' }

			const result = service.formatNoteMessage(note, 'created', author)

			expect(result.title).toBe('Title with <tags> & "quotes" and \'apostrophes\'')
			expect(result.content).toBe('Content with\nnewlines\tand\ttabs')
			expect(result.author).toBe('Test & User <script>')
		})

		it('should handle note with unicode and emoji', () => {
			const note: OrganizationNote = {
				id: 'note-unicode',
				title: '📝 Meeting Notes 会议记录',
				content: 'Discussion about 🚀 features and 改进',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: '用户 👤' }

			const result = service.formatNoteMessage(note, 'updated', author)

			expect(result.title).toBe('📝 Meeting Notes 会议记录')
			expect(result.content).toBe('Discussion about 🚀 features and 改进')
			expect(result.author).toBe('用户 👤')
		})

		it('should handle all three change types correctly', () => {
			const note: OrganizationNote = {
				id: 'note-changes',
				title: 'Test Note',
				content: 'Test content',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User' }

			const created = service.formatNoteMessage(note, 'created', author)
			const updated = service.formatNoteMessage(note, 'updated', author)
			const deleted = service.formatNoteMessage(note, 'deleted', author)

			expect(created.changeType).toBe('created')
			expect(updated.changeType).toBe('updated')
			expect(deleted.changeType).toBe('deleted')
		})

		it('should generate correct note URLs for different ID formats', () => {
			const uuidNote: OrganizationNote = {
				id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
				title: 'UUID Note',
				content: '',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}

			const shortIdNote: OrganizationNote = {
				id: '123',
				title: 'Short ID Note',
				content: '',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}

			const author = { name: 'Test User' }

			const uuidResult = service.formatNoteMessage(uuidNote, 'created', author)
			const shortIdResult = service.formatNoteMessage(
				shortIdNote,
				'created',
				author,
			)

			expect(uuidResult.noteUrl).toBe(
				'/notes/f47ac10b-58cc-4372-a567-0e02b2c3d479',
			)
			expect(shortIdResult.noteUrl).toBe('/notes/123')
		})

		it('should handle note with whitespace-only content', () => {
			const note: OrganizationNote = {
				id: 'note-whitespace',
				title: 'Whitespace Note',
				content: '   \n\t\r   ',
				organizationId: 'org-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdById: 'user-123',
			}
			const author = { name: 'Test User' }

			const result = service.formatNoteMessage(note, 'created', author)

			expect(result.content).toBe('   \n\t\r   ')
		})
	})

	describe('Error handling and edge cases', () => {
		it('should propagate errors from integration manager', async () => {
			const error = new Error('Integration manager error')
			vi.mocked(integrationManager.initiateOAuth).mockRejectedValue(error)

			await expect(
				service.initiateOAuth('org-123', 'slack', 'https://callback.com'),
			).rejects.toThrow('Integration manager error')
		})

		it('should handle empty organization ID', async () => {
			const expectedResult = {
				authUrl: 'https://slack.com/oauth/authorize',
				state: 'oauth-state-123',
			}
			vi.mocked(integrationManager.initiateOAuth).mockResolvedValue(
				expectedResult,
			)

			const result = await service.initiateOAuth('', 'slack', 'https://callback.com')

			expect(result).toEqual(expectedResult)
			expect(integrationManager.initiateOAuth).toHaveBeenCalledWith(
				'',
				'slack',
				'https://callback.com',
				undefined,
			)
		})

		it('should handle special characters in provider name', async () => {
			const expectedResult = {
				authUrl: 'https://test.com/oauth',
				state: 'state-123',
			}
			vi.mocked(integrationManager.initiateOAuth).mockResolvedValue(
				expectedResult,
			)

			const result = await service.initiateOAuth(
				'org-123',
				'provider-with-dashes',
				'https://callback.com',
			)

			expect(result).toEqual(expectedResult)
		})

		it('should handle very long redirectUri', async () => {
			const longUri = 'https://example.com/' + 'a'.repeat(1000)
			const expectedResult = {
				authUrl: 'https://test.com/oauth',
				state: 'state-123',
			}
			vi.mocked(integrationManager.initiateOAuth).mockResolvedValue(
				expectedResult,
			)

			const result = await service.initiateOAuth('org-123', 'test', longUri)

			expect(result).toEqual(expectedResult)
			expect(integrationManager.initiateOAuth).toHaveBeenCalledWith(
				'org-123',
				'test',
				longUri,
				undefined,
			)
		})

		it('should handle empty additional params object', async () => {
			const expectedResult = {
				authUrl: 'https://test.com/oauth',
				state: 'state-123',
			}
			vi.mocked(integrationManager.initiateOAuth).mockResolvedValue(
				expectedResult,
			)

			const result = await service.initiateOAuth(
				'org-123',
				'test',
				'https://callback.com',
				{},
			)

			expect(result).toEqual(expectedResult)
			expect(integrationManager.initiateOAuth).toHaveBeenCalledWith(
				'org-123',
				'test',
				'https://callback.com',
				{},
			)
		})

		it('should handle nested additional params', async () => {
			const expectedResult = {
				authUrl: 'https://test.com/oauth',
				state: 'state-123',
			}
			const complexParams = {
				scope: 'read write',
				nested: { data: { value: 123 } },
				array: [1, 2, 3],
			}
			vi.mocked(integrationManager.initiateOAuth).mockResolvedValue(
				expectedResult,
			)

			const result = await service.initiateOAuth(
				'org-123',
				'test',
				'https://callback.com',
				complexParams,
			)

			expect(result).toEqual(expectedResult)
			expect(integrationManager.initiateOAuth).toHaveBeenCalledWith(
				'org-123',
				'test',
				'https://callback.com',
				complexParams,
			)
		})
	})

	describe('logIntegrationActivity edge cases', () => {
		it('should handle logging without optional parameters', async () => {
			vi.mocked(integrationManager.logIntegrationActivity).mockResolvedValue()

			await service.logIntegrationActivity('integration-123', 'test_action', 'success')

			expect(integrationManager.logIntegrationActivity).toHaveBeenCalledWith(
				'integration-123',
				'test_action',
				'success',
				undefined,
				undefined,
			)
		})

		it('should handle logging with only data parameter', async () => {
			vi.mocked(integrationManager.logIntegrationActivity).mockResolvedValue()
			const data = { key: 'value' }

			await service.logIntegrationActivity(
				'integration-123',
				'test_action',
				'success',
				data,
			)

			expect(integrationManager.logIntegrationActivity).toHaveBeenCalledWith(
				'integration-123',
				'test_action',
				'success',
				data,
				undefined,
			)
		})

		it('should handle logging with only error parameter', async () => {
			vi.mocked(integrationManager.logIntegrationActivity).mockResolvedValue()

			await service.logIntegrationActivity(
				'integration-123',
				'test_action',
				'error',
				undefined,
				'Error message',
			)

			expect(integrationManager.logIntegrationActivity).toHaveBeenCalledWith(
				'integration-123',
				'test_action',
				'error',
				undefined,
				'Error message',
			)
		})

		it('should handle logging with very long error message', async () => {
			vi.mocked(integrationManager.logIntegrationActivity).mockResolvedValue()
			const longError = 'Error: ' + 'x'.repeat(10000)

			await service.logIntegrationActivity(
				'integration-123',
				'test_action',
				'error',
				undefined,
				longError,
			)

			expect(integrationManager.logIntegrationActivity).toHaveBeenCalledWith(
				'integration-123',
				'test_action',
				'error',
				undefined,
				longError,
			)
		})

		it('should handle logging with complex nested data', async () => {
			vi.mocked(integrationManager.logIntegrationActivity).mockResolvedValue()
			const complexData = {
				level1: {
					level2: {
						level3: {
							array: [1, 2, 3],
							bool: true,
							null: null,
							undefined: undefined,
						},
					},
				},
			}

			await service.logIntegrationActivity(
				'integration-123',
				'test_action',
				'pending',
				complexData,
			)

			expect(integrationManager.logIntegrationActivity).toHaveBeenCalledWith(
				'integration-123',
				'test_action',
				'pending',
				complexData,
				undefined,
			)
		})

		it('should handle all status types', async () => {
			vi.mocked(integrationManager.logIntegrationActivity).mockResolvedValue()

			await service.logIntegrationActivity('int-1', 'action1', 'success')
			await service.logIntegrationActivity('int-2', 'action2', 'error')
			await service.logIntegrationActivity('int-3', 'action3', 'pending')

			expect(integrationManager.logIntegrationActivity).toHaveBeenCalledTimes(3)
		})
	})

	describe('validateIntegrationConnections edge cases', () => {
		it('should handle validation with no connections', async () => {
			const result = {
				valid: 0,
				invalid: 0,
				errors: [],
			}
			vi.mocked(
				integrationManager.validateIntegrationConnections,
			).mockResolvedValue(result)

			const response = await service.validateIntegrationConnections('int-123')

			expect(response).toEqual(result)
		})

		it('should handle validation with only valid connections', async () => {
			const result = {
				valid: 5,
				invalid: 0,
				errors: [],
			}
			vi.mocked(
				integrationManager.validateIntegrationConnections,
			).mockResolvedValue(result)

			const response = await service.validateIntegrationConnections('int-123')

			expect(response.valid).toBe(5)
			expect(response.invalid).toBe(0)
			expect(response.errors).toHaveLength(0)
		})

		it('should handle validation with only invalid connections', async () => {
			const result = {
				valid: 0,
				invalid: 3,
				errors: ['Error 1', 'Error 2', 'Error 3'],
			}
			vi.mocked(
				integrationManager.validateIntegrationConnections,
			).mockResolvedValue(result)

			const response = await service.validateIntegrationConnections('int-123')

			expect(response.valid).toBe(0)
			expect(response.invalid).toBe(3)
			expect(response.errors).toHaveLength(3)
		})

		it('should handle validation with many errors', async () => {
			const errors = Array.from({ length: 100 }, (_, i) => `Error ${i}`)
			const result = {
				valid: 0,
				invalid: 100,
				errors: errors,
			}
			vi.mocked(
				integrationManager.validateIntegrationConnections,
			).mockResolvedValue(result)

			const response = await service.validateIntegrationConnections('int-123')

			expect(response.errors).toHaveLength(100)
		})
	})

	describe('updateIntegrationConfig edge cases', () => {
		it('should handle empty config object', async () => {
			const mockIntegration = {
				id: 'int-123',
				config: JSON.stringify({}),
			}
			vi.mocked(integrationManager.updateIntegrationConfig).mockResolvedValue(
				mockIntegration,
			)

			const result = await service.updateIntegrationConfig('int-123', {})

			expect(result).toEqual(mockIntegration)
			expect(integrationManager.updateIntegrationConfig).toHaveBeenCalledWith(
				'int-123',
				{},
			)
		})

		it('should handle config with null values', async () => {
			const config = {
				setting1: null,
				setting2: 'value',
				setting3: null,
			}
			const mockIntegration = {
				id: 'int-123',
				config: JSON.stringify(config),
			}
			vi.mocked(integrationManager.updateIntegrationConfig).mockResolvedValue(
				mockIntegration,
			)

			const result = await service.updateIntegrationConfig('int-123', config)

			expect(result).toEqual(mockIntegration)
		})

		it('should handle config with undefined values', async () => {
			const config = {
				setting1: undefined,
				setting2: 'value',
			}
			const mockIntegration = {
				id: 'int-123',
				config: JSON.stringify(config),
			}
			vi.mocked(integrationManager.updateIntegrationConfig).mockResolvedValue(
				mockIntegration,
			)

			const result = await service.updateIntegrationConfig('int-123', config)

			expect(result).toEqual(mockIntegration)
		})

		it('should handle config with arrays and objects', async () => {
			const config = {
				array: [1, 2, 3],
				object: { nested: { value: 'test' } },
				boolean: true,
				number: 42,
			}
			const mockIntegration = {
				id: 'int-123',
				config: JSON.stringify(config),
			}
			vi.mocked(integrationManager.updateIntegrationConfig).mockResolvedValue(
				mockIntegration,
			)

			const result = await service.updateIntegrationConfig('int-123', config)

			expect(result).toEqual(mockIntegration)
		})
	})
})
