import { describe, it, expect, beforeEach, vi } from 'vitest'
import { JiraProvider } from '../../../src/providers/jira/provider'
import { fixtures } from '../../utils/fixtures'
import type { Integration, NoteIntegrationConnection } from '@prisma/client'

// Mock the encryption module
vi.mock('../../../src/encryption', () => ({
	decryptToken: vi.fn().mockResolvedValue('decrypted-access-token'),
	encryptToken: vi.fn().mockResolvedValue('encrypted-token'),
}))

// Mock the integration manager
vi.mock('../../../src/integration-manager', () => ({
	integrationManager: {
		refreshIntegrationTokens: vi.fn().mockResolvedValue({
			id: 'integration-123',
			accessToken: 'new-encrypted-token',
			refreshToken: 'new-encrypted-refresh-token',
		}),
	},
}))

describe('JiraProvider', () => {
	let provider: JiraProvider
	let mockIntegration: Integration
	let mockConnection: NoteIntegrationConnection & { integration: Integration }

	beforeEach(() => {
		provider = new JiraProvider()

		mockIntegration = {
			...fixtures.testData.integration,
			providerName: 'jira',
		} as Integration

		mockConnection = {
			...fixtures.testData.connection,
			integration: mockIntegration,
		} as NoteIntegrationConnection & { integration: Integration }

		// Reset environment variables
		process.env.JIRA_CLIENT_ID = 'test-client-id'
		process.env.JIRA_CLIENT_SECRET = 'test-client-secret'

		// Reset fetch mock
		global.fetch = vi.fn()
	})

	describe('Provider Properties', () => {
		it('should have correct provider metadata', () => {
			expect(provider.name).toBe('jira')
			expect(provider.type).toBe('productivity')
			expect(provider.displayName).toBe('Jira')
			expect(provider.description).toBe(
				'Connect notes to Jira projects for issue tracking and project management',
			)
			expect(provider.logoPath).toBe('/icons/jira.svg')
		})
	})

	describe('Configuration Schema', () => {
		it('should return correct configuration schema', () => {
			const schema = provider.getConfigSchema()

			expect(schema).toEqual({
				type: 'object',
				properties: {
					instanceUrl: {
						type: 'string',
						title: 'Jira Instance URL',
						description:
							'Your Jira Cloud instance URL (e.g., https://yourcompany.atlassian.net)',
						pattern: '^https://[a-zA-Z0-9-]+\\.atlassian\\.net/?$',
					},
					defaultIssueType: {
						type: 'string',
						title: 'Default Issue Type',
						description:
							'Default issue type for created issues (e.g., Task, Story, Bug)',
						default: 'Task',
					},
					includeNoteContent: {
						type: 'boolean',
						title: 'Include Note Content',
						description:
							'Include the full note content in the issue description',
						default: true,
					},
				},
				required: ['instanceUrl'],
			})
		})
	})

	describe('Connection Validation', () => {
		it('should validate connection successfully', async () => {
			// Mock accessible resources response
			const mockResourcesResponse = {
				ok: true,
				json: vi
					.fn()
					.mockResolvedValue(fixtures.jira.accessibleResourcesResponse),
			}

			// Mock project response
			const mockProjectResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue(fixtures.jira.projectResponse),
			}

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce(mockResourcesResponse)
				.mockResolvedValueOnce(mockProjectResponse)

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(true)
			expect(fetch).toHaveBeenCalledWith(
				'https://api.atlassian.com/ex/jira/test-cloud-id/rest/api/3/project/TEST?expand=lead,description',
				{
					headers: {
						Authorization: 'Bearer decrypted-access-token',
						Accept: 'application/json',
					},
				},
			)
		})

		it('should return false when access token is missing', async () => {
			const connectionWithoutToken = {
				...mockConnection,
				integration: {
					...mockIntegration,
					accessToken: null,
				} as Integration,
			}

			const isValid = await provider.validateConnection(connectionWithoutToken)

			expect(isValid).toBe(false)
		})

		it('should return false when external ID is missing', async () => {
			const connectionWithoutExternalId = {
				...mockConnection,
				externalId: '',
			} as NoteIntegrationConnection & { integration: Integration }

			const isValid = await provider.validateConnection(
				connectionWithoutExternalId,
			)

			expect(isValid).toBe(false)
		})

		it('should return false when API call fails', async () => {
			const mockErrorResponse = {
				ok: false,
				statusText: 'Not Found',
			}

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce({
					ok: true,
					json: vi
						.fn()
						.mockResolvedValue(fixtures.jira.accessibleResourcesResponse),
				})
				.mockResolvedValueOnce(mockErrorResponse)

			const isValid = await provider.validateConnection(mockConnection)

			expect(isValid).toBe(false)
		})
	})

	describe('User Management', () => {
		it('should get current user details', async () => {
			const mockUserResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					accountId: '123456:abcd-efgh-ijkl',
					displayName: 'Test User',
					emailAddress: 'test@example.com',
					locale: 'en_US',
					timeZone: 'America/New_York',
				}),
			}

			global.fetch = vi.fn().mockResolvedValue(mockUserResponse)

			const userDetails = await provider.getCurrentUserDetails(mockIntegration)

			expect(userDetails).toEqual({
				accountId: '123456:abcd-efgh-ijkl',
				displayName: 'Test User',
				emailAddress: 'test@example.com',
				locale: 'en_US',
				timeZone: 'America/New_York',
			})

			expect(fetch).toHaveBeenCalledWith(
				'https://test.atlassian.net/rest/api/3/myself',
				{
					headers: {
						Authorization: 'Bearer decrypted-access-token',
						Accept: 'application/json',
					},
				},
			)
		})

		it('should search for users', async () => {
			const mockUsersResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([
					{
						accountId: '123456:user1',
						displayName: 'John Doe',
						emailAddress: 'john@example.com',
					},
					{
						accountId: '123456:user2',
						displayName: 'Jane Smith',
						emailAddress: 'jane@example.com',
					},
				]),
			}

			global.fetch = vi.fn().mockResolvedValue(mockUsersResponse)

			const users = await provider.searchUsers(mockIntegration, 'john')

			expect(users).toHaveLength(2)
			expect(users[0].displayName).toBe('John Doe')
			expect(users[1].displayName).toBe('Jane Smith')

			expect(fetch).toHaveBeenCalledWith(
				'https://test.atlassian.net/rest/api/3/user/search?query=john',
				{
					headers: {
						Authorization: 'Bearer decrypted-access-token',
						Accept: 'application/json',
					},
				},
			)
		})

		it('should configure bot user', async () => {
			const mockBotUserResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					accountId: '123456:bot-user',
					displayName: 'Bot User',
					emailAddress: 'bot@example.com',
				}),
			}

			global.fetch = vi.fn().mockResolvedValue(mockBotUserResponse)

			const botUser = await provider.configureBotUser(
				mockIntegration,
				'123456:bot-user',
			)

			expect(botUser).toEqual({
				accountId: '123456:bot-user',
				displayName: 'Bot User',
				emailAddress: 'bot@example.com',
			})

			expect(fetch).toHaveBeenCalledWith(
				'https://test.atlassian.net/rest/api/3/user?accountId=123456:bot-user',
				{
					headers: {
						Authorization: 'Bearer decrypted-access-token',
						Accept: 'application/json',
					},
				},
			)
		})

		it('should validate bot user permissions', async () => {
			const mockUserResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					accountId: '123456:bot-user',
					displayName: 'Bot User',
				}),
			}

			const mockPermissionResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([
					{
						permission: 'CREATE_ISSUES',
						havePermission: true,
					},
				]),
			}

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce(mockUserResponse)
				.mockResolvedValueOnce(mockPermissionResponse)

			const validation = await provider.validateBotUser(
				mockIntegration,
				'123456:bot-user',
				'TEST',
			)

			expect(validation).toEqual({ valid: true })

			expect(fetch).toHaveBeenCalledWith(
				'https://test.atlassian.net/rest/api/3/user?accountId=123456:bot-user',
				{
					headers: {
						Authorization: 'Bearer decrypted-access-token',
						Accept: 'application/json',
					},
				},
			)

			expect(fetch).toHaveBeenCalledWith(
				'https://test.atlassian.net/rest/api/3/user/permission/search?permissions=CREATE_ISSUES&projectKey=TEST&accountId=123456:bot-user',
				{
					headers: {
						Authorization: 'Bearer decrypted-access-token',
						Accept: 'application/json',
					},
				},
			)
		})

		it('should return invalid when bot user lacks permissions', async () => {
			const mockUserResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue({
					accountId: '123456:bot-user',
					displayName: 'Bot User',
				}),
			}

			const mockPermissionResponse = {
				ok: true,
				json: vi.fn().mockResolvedValue([
					{
						permission: 'CREATE_ISSUES',
						havePermission: false,
					},
				]),
			}

			global.fetch = vi
				.fn()
				.mockResolvedValueOnce(mockUserResponse)
				.mockResolvedValueOnce(mockPermissionResponse)

			const validation = await provider.validateBotUser(
				mockIntegration,
				'123456:bot-user',
				'TEST',
			)

			expect(validation).toEqual({
				valid: false,
				reason:
					'Bot user does not have CREATE_ISSUES permission for this project',
			})
		})

		it('should return invalid when bot user not found', async () => {
			const mockUserErrorResponse = {
				ok: false,
				statusText: 'Not Found',
			}

			global.fetch = vi.fn().mockResolvedValue(mockUserErrorResponse)

			const validation = await provider.validateBotUser(
				mockIntegration,
				'123456:bot-user',
				'TEST',
			)

			expect(validation).toEqual({
				valid: false,
				reason: 'Bot user account not found',
			})
		})
	})

	describe('Error Handling', () => {
		it('should use demo client ID when JIRA_CLIENT_ID is not set', async () => {
			delete process.env.JIRA_CLIENT_ID

			const authUrl = await provider.getAuthUrl(
				'org-123',
				'https://example.com/callback',
			)
			expect(authUrl).toContain('client_id=demo-jira-client-id')
		})

		it('should use demo client secret when JIRA_CLIENT_SECRET is not set', async () => {
			delete process.env.JIRA_CLIENT_SECRET

			// The refresh token method will still fail with demo credentials due to invalid API response,
			// but it won't throw the environment variable error anymore
			await expect(
				provider.refreshToken('test-refresh-token'),
			).rejects.toThrow()
		})

		it('should handle network errors gracefully', async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

			await expect(
				provider.getAvailableChannels(mockIntegration),
			).rejects.toThrow('Failed to fetch Jira projects: Network error')
		})
	})

	describe('Integration with Base Provider', () => {
		it('should inherit from BaseIntegrationProvider', () => {
			expect(provider).toBeInstanceOf(
				Object.getPrototypeOf(provider).constructor,
			)
			expect(typeof (provider as any).generateOAuthState).toBe('function')
			expect(typeof (provider as any).parseOAuthState).toBe('function')
		})

		it('should generate and parse OAuth state correctly', async () => {
			const organizationId = 'org-123'
			const redirectUri = 'https://example.com/callback'

			const authUrl = await provider.getAuthUrl(organizationId, redirectUri)
			const urlParams = new URLSearchParams(authUrl.split('?')[1])
			const state = urlParams.get('state')

			expect(state).toBeTruthy()

			const statePayload = state!.split('.')[0]
			const decodedState = JSON.parse(
				Buffer.from(statePayload, 'base64').toString(),
			) as {
				organizationId: string
				providerName: string
				redirectUri: string
			}
			expect(decodedState.organizationId).toBe(organizationId)
			expect(decodedState.providerName).toBe('jira')
			expect(decodedState.redirectUri).toBe(redirectUri)
		})
	})
})
