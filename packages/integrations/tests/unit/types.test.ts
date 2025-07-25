/**
 * Tests for type definitions and interfaces
 */

import { describe, it, expect } from 'vitest'
import type {
	TokenData,
	Channel,
	MessageData,
	SlackConfig,
	JiraConfig,
	LinearConfig,
	GitLabConfig,
	ClickUpConfig,
	NotionConfig,
	AsanaConfig,
	TrelloConfig,
	GitHubConfig,
	SlackConnectionConfig,
	JiraConnectionConfig,
	LinearConnectionConfig,
	GitLabConnectionConfig,
	ClickUpConnectionConfig,
	NotionConnectionConfig,
	AsanaConnectionConfig,
	TrelloConnectionConfig,
	GitHubConnectionConfig,
	OAuthCallbackParams,
	OAuthState,
	IntegrationLogEntry,
	IntegrationProvider,
} from '../../src/types'

describe('Type Definitions', () => {
	describe('TokenData', () => {
		it('should accept valid token data', () => {
			const tokenData: TokenData = {
				accessToken: 'access-token-123',
				refreshToken: 'refresh-token-123',
				expiresAt: new Date(),
				scope: 'read write',
				metadata: { custom: 'data' },
			}

			expect(tokenData.accessToken).toBe('access-token-123')
			expect(tokenData.refreshToken).toBe('refresh-token-123')
			expect(tokenData.expiresAt).toBeInstanceOf(Date)
			expect(tokenData.scope).toBe('read write')
			expect(tokenData.metadata).toEqual({ custom: 'data' })
		})

		it('should work with minimal token data', () => {
			const tokenData: TokenData = {
				accessToken: 'access-token-123',
			}

			expect(tokenData.accessToken).toBe('access-token-123')
			expect(tokenData.refreshToken).toBeUndefined()
			expect(tokenData.expiresAt).toBeUndefined()
			expect(tokenData.scope).toBeUndefined()
			expect(tokenData.metadata).toBeUndefined()
		})
	})

	describe('Channel', () => {
		it('should accept valid channel data', () => {
			const channel: Channel = {
				id: 'channel-123',
				name: 'general',
				type: 'public',
				metadata: { description: 'General discussion' },
			}

			expect(channel.id).toBe('channel-123')
			expect(channel.name).toBe('general')
			expect(channel.type).toBe('public')
			expect(channel.metadata).toEqual({ description: 'General discussion' })
		})

		it('should accept all channel types', () => {
			const publicChannel: Channel = { id: '1', name: 'public', type: 'public' }
			const privateChannel: Channel = {
				id: '2',
				name: 'private',
				type: 'private',
			}
			const dmChannel: Channel = { id: '3', name: 'dm', type: 'dm' }

			expect(publicChannel.type).toBe('public')
			expect(privateChannel.type).toBe('private')
			expect(dmChannel.type).toBe('dm')
		})
	})

	describe('MessageData', () => {
		it('should accept valid message data', () => {
			const messageData: MessageData = {
				title: 'Note Title',
				content: 'Note content here',
				author: 'John Doe',
				noteUrl: 'https://example.com/notes/123',
				changeType: 'created',
			}

			expect(messageData.title).toBe('Note Title')
			expect(messageData.content).toBe('Note content here')
			expect(messageData.author).toBe('John Doe')
			expect(messageData.noteUrl).toBe('https://example.com/notes/123')
			expect(messageData.changeType).toBe('created')
		})

		it('should accept all change types', () => {
			const created: MessageData['changeType'] = 'created'
			const updated: MessageData['changeType'] = 'updated'
			const deleted: MessageData['changeType'] = 'deleted'

			expect(created).toBe('created')
			expect(updated).toBe('updated')
			expect(deleted).toBe('deleted')
		})
	})

	describe('Provider Configurations', () => {
		it('should accept valid SlackConfig', () => {
			const config: SlackConfig = {
				teamId: 'T123456',
				teamName: 'My Team',
				botUserId: 'U123456',
				scope: 'channels:read,chat:write',
			}

			expect(config.teamId).toBe('T123456')
			expect(config.teamName).toBe('My Team')
			expect(config.botUserId).toBe('U123456')
			expect(config.scope).toBe('channels:read,chat:write')
		})

		it('should accept valid JiraConfig', () => {
			const config: JiraConfig = {
				instanceUrl: 'https://company.atlassian.net',
				cloudId: 'cloud-123',
				scope: 'read:jira-work write:jira-work',
				user: {
					accountId: 'account-123',
					displayName: 'John Doe',
					emailAddress: 'john@example.com',
				},
				useBotUser: true,
				botUser: {
					accountId: 'bot-account-123',
					displayName: 'Bot User',
					emailAddress: 'bot@example.com',
				},
			}

			expect(config.instanceUrl).toBe('https://company.atlassian.net')
			expect(config.cloudId).toBe('cloud-123')
			expect(config.user.accountId).toBe('account-123')
			expect(config.useBotUser).toBe(true)
			expect(config.botUser?.accountId).toBe('bot-account-123')
		})

		it('should accept valid LinearConfig', () => {
			const config: LinearConfig = {
				userId: 'user-123',
				userName: 'johndoe',
				userEmail: 'john@example.com',
				scope: 'read write',
			}

			expect(config.userId).toBe('user-123')
			expect(config.userName).toBe('johndoe')
			expect(config.userEmail).toBe('john@example.com')
			expect(config.scope).toBe('read write')
		})

		it('should accept valid GitLabConfig', () => {
			const config: GitLabConfig = {
				instanceUrl: 'https://gitlab.com',
				scope: 'api read_user',
				user: {
					id: 123,
					username: 'johndoe',
					name: 'John Doe',
					email: 'john@example.com',
					avatarUrl: 'https://example.com/avatar.jpg',
				},
			}

			expect(config.instanceUrl).toBe('https://gitlab.com')
			expect(config.scope).toBe('api read_user')
			expect(config.user.id).toBe(123)
			expect(config.user.username).toBe('johndoe')
		})

		it('should accept valid ClickUpConfig', () => {
			const config: ClickUpConfig = {
				scope: 'read write',
				user: {
					id: 123,
					username: 'johndoe',
					email: 'john@example.com',
					profilePicture: 'https://example.com/pic.jpg',
					initials: 'JD',
					timezone: 'America/New_York',
				},
			}

			expect(config.user.id).toBe(123)
			expect(config.user.username).toBe('johndoe')
			expect(config.user.initials).toBe('JD')
			expect(config.user.timezone).toBe('America/New_York')
		})

		it('should accept valid NotionConfig', () => {
			const config: NotionConfig = {
				workspaceId: 'workspace-123',
				workspaceName: 'My Workspace',
				botId: 'bot-123',
				user: {
					id: 'user-123',
					name: 'John Doe',
					email: 'john@example.com',
					avatarUrl: 'https://example.com/avatar.jpg',
				},
			}

			expect(config.workspaceId).toBe('workspace-123')
			expect(config.workspaceName).toBe('My Workspace')
			expect(config.botId).toBe('bot-123')
			expect(config.user.id).toBe('user-123')
		})

		it('should accept valid AsanaConfig', () => {
			const config: AsanaConfig = {
				user: {
					gid: 'user-123',
					name: 'John Doe',
					email: 'john@example.com',
					photo: {
						image_21x21: 'https://example.com/21x21.jpg',
						image_60x60: 'https://example.com/60x60.jpg',
					},
				},
				workspaces: [
					{
						gid: 'workspace-123',
						name: 'My Workspace',
						resource_type: 'workspace',
					},
				],
			}

			expect(config.user.gid).toBe('user-123')
			expect(config.user.name).toBe('John Doe')
			expect(config.workspaces).toHaveLength(1)
			expect(config.workspaces[0].gid).toBe('workspace-123')
		})

		it('should accept valid TrelloConfig', () => {
			const config: TrelloConfig = {
				user: {
					id: 'user-123',
					username: 'johndoe',
					fullName: 'John Doe',
					email: 'john@example.com',
					avatarUrl: 'https://example.com/avatar.jpg',
				},
				boards: [
					{
						id: 'board-123',
						name: 'My Board',
						url: 'https://trello.com/b/board-123',
					},
				],
			}

			expect(config.user.id).toBe('user-123')
			expect(config.user.username).toBe('johndoe')
			expect(config.boards).toHaveLength(1)
			expect(config.boards[0].id).toBe('board-123')
		})

		it('should accept valid GitHubConfig', () => {
			const config: GitHubConfig = {
				user: {
					id: 123,
					login: 'johndoe',
					name: 'John Doe',
					email: 'john@example.com',
					avatarUrl: 'https://example.com/avatar.jpg',
				},
				scope: 'repo issues',
			}

			expect(config.user.id).toBe(123)
			expect(config.user.login).toBe('johndoe')
			expect(config.scope).toBe('repo issues')
		})
	})

	describe('Connection Configurations', () => {
		it('should accept valid SlackConnectionConfig', () => {
			const config: SlackConnectionConfig = {
				channelName: 'general',
				channelType: 'public',
				postFormat: 'blocks',
				includeContent: true,
			}

			expect(config.channelName).toBe('general')
			expect(config.channelType).toBe('public')
			expect(config.postFormat).toBe('blocks')
			expect(config.includeContent).toBe(true)
		})

		it('should accept valid JiraConnectionConfig', () => {
			const config: JiraConnectionConfig = {
				projectKey: 'PROJ',
				projectName: 'My Project',
				defaultIssueType: 'Task',
				includeNoteContent: true,
				useBotUser: true,
				reporterAccountId: 'reporter-123',
			}

			expect(config.projectKey).toBe('PROJ')
			expect(config.projectName).toBe('My Project')
			expect(config.defaultIssueType).toBe('Task')
			expect(config.includeNoteContent).toBe(true)
			expect(config.useBotUser).toBe(true)
			expect(config.reporterAccountId).toBe('reporter-123')
		})

		it('should accept valid LinearConnectionConfig', () => {
			const config: LinearConnectionConfig = {
				channelId: 'channel-123',
				channelName: 'Engineering',
				channelType: 'team',
				includeNoteContent: true,
				defaultIssueState: 'Todo',
				issuePriority: 'High',
			}

			expect(config.channelId).toBe('channel-123')
			expect(config.channelName).toBe('Engineering')
			expect(config.channelType).toBe('team')
			expect(config.includeNoteContent).toBe(true)
			expect(config.defaultIssueState).toBe('Todo')
			expect(config.issuePriority).toBe('High')
		})

		it('should accept valid GitLabConnectionConfig', () => {
			const config: GitLabConnectionConfig = {
				projectId: 'project-123',
				projectName: 'My Project',
				projectPath: 'group/project',
				includeNoteContent: true,
				defaultLabels: ['bug', 'enhancement'],
				milestoneId: 1,
				assigneeId: 123,
			}

			expect(config.projectId).toBe('project-123')
			expect(config.projectName).toBe('My Project')
			expect(config.projectPath).toBe('group/project')
			expect(config.includeNoteContent).toBe(true)
			expect(config.defaultLabels).toEqual(['bug', 'enhancement'])
			expect(config.milestoneId).toBe(1)
			expect(config.assigneeId).toBe(123)
		})

		it('should accept valid ClickUpConnectionConfig', () => {
			const config: ClickUpConnectionConfig = {
				listId: 'list-123',
				listName: 'My List',
				spaceName: 'My Space',
				teamName: 'My Team',
				includeNoteContent: true,
				defaultPriority: 2,
				defaultAssignees: [123, 456],
				defaultTags: ['urgent', 'bug'],
				defaultStatus: 'Open',
			}

			expect(config.listId).toBe('list-123')
			expect(config.listName).toBe('My List')
			expect(config.spaceName).toBe('My Space')
			expect(config.teamName).toBe('My Team')
			expect(config.includeNoteContent).toBe(true)
			expect(config.defaultPriority).toBe(2)
			expect(config.defaultAssignees).toEqual([123, 456])
			expect(config.defaultTags).toEqual(['urgent', 'bug'])
			expect(config.defaultStatus).toBe('Open')
		})

		it('should accept valid NotionConnectionConfig', () => {
			const config: NotionConnectionConfig = {
				databaseId: 'database-123',
				databaseName: 'My Database',
				includeNoteContent: true,
				defaultProperties: {
					Status: 'Not started',
					Priority: 'Medium',
				},
			}

			expect(config.databaseId).toBe('database-123')
			expect(config.databaseName).toBe('My Database')
			expect(config.includeNoteContent).toBe(true)
			expect(config.defaultProperties).toEqual({
				Status: 'Not started',
				Priority: 'Medium',
			})
		})

		it('should accept valid AsanaConnectionConfig', () => {
			const config: AsanaConnectionConfig = {
				projectGid: 'project-123',
				projectName: 'My Project',
				workspaceName: 'My Workspace',
				includeNoteContent: true,
				defaultAssignee: 'user-123',
				defaultSection: 'section-123',
			}

			expect(config.projectGid).toBe('project-123')
			expect(config.projectName).toBe('My Project')
			expect(config.workspaceName).toBe('My Workspace')
			expect(config.includeNoteContent).toBe(true)
			expect(config.defaultAssignee).toBe('user-123')
			expect(config.defaultSection).toBe('section-123')
		})

		it('should accept valid TrelloConnectionConfig', () => {
			const config: TrelloConnectionConfig = {
				listId: 'list-123',
				listName: 'To Do',
				boardName: 'My Board',
				includeNoteContent: true,
				defaultLabels: ['label-1', 'label-2'],
				defaultMembers: ['member-1', 'member-2'],
			}

			expect(config.listId).toBe('list-123')
			expect(config.listName).toBe('To Do')
			expect(config.boardName).toBe('My Board')
			expect(config.includeNoteContent).toBe(true)
			expect(config.defaultLabels).toEqual(['label-1', 'label-2'])
			expect(config.defaultMembers).toEqual(['member-1', 'member-2'])
		})

		it('should accept valid GitHubConnectionConfig', () => {
			const config: GitHubConnectionConfig = {
				repositoryId: 'repo-123',
				repositoryName: 'my-repo',
				repositoryFullName: 'user/my-repo',
				ownerName: 'user',
				includeNoteContent: true,
				defaultLabels: ['bug', 'enhancement'],
				defaultAssignees: ['user1', 'user2'],
				defaultMilestone: 1,
			}

			expect(config.repositoryId).toBe('repo-123')
			expect(config.repositoryName).toBe('my-repo')
			expect(config.repositoryFullName).toBe('user/my-repo')
			expect(config.ownerName).toBe('user')
			expect(config.includeNoteContent).toBe(true)
			expect(config.defaultLabels).toEqual(['bug', 'enhancement'])
			expect(config.defaultAssignees).toEqual(['user1', 'user2'])
			expect(config.defaultMilestone).toBe(1)
		})
	})

	describe('OAuth Types', () => {
		it('should accept valid OAuthCallbackParams', () => {
			const params: OAuthCallbackParams = {
				organizationId: 'org-123',
				code: 'auth-code-123',
				state: 'state-123',
				error: 'access_denied',
				errorDescription: 'User denied access',
				oauthToken: 'oauth-token-123',
			}

			expect(params.organizationId).toBe('org-123')
			expect(params.code).toBe('auth-code-123')
			expect(params.state).toBe('state-123')
			expect(params.error).toBe('access_denied')
			expect(params.errorDescription).toBe('User denied access')
			expect(params.oauthToken).toBe('oauth-token-123')
		})

		it('should accept valid OAuthState', () => {
			const state: OAuthState = {
				organizationId: 'org-123',
				providerName: 'slack',
				redirectUrl: 'https://example.com/callback',
				timestamp: Date.now(),
				nonce: 'nonce-123',
				customData: 'custom-value',
			}

			expect(state.organizationId).toBe('org-123')
			expect(state.providerName).toBe('slack')
			expect(state.redirectUrl).toBe('https://example.com/callback')
			expect(typeof state.timestamp).toBe('number')
			expect(state.nonce).toBe('nonce-123')
			expect(state.customData).toBe('custom-value')
		})
	})

	describe('Integration Types', () => {
		it('should accept valid IntegrationLogEntry', () => {
			const logEntry: IntegrationLogEntry = {
				action: 'post_message',
				status: 'success',
				requestData: { channelId: 'channel-123' },
				responseData: { messageId: 'msg-123' },
				errorMessage: 'Error occurred',
				timestamp: new Date(),
			}

			expect(logEntry.action).toBe('post_message')
			expect(logEntry.status).toBe('success')
			expect(logEntry.requestData).toEqual({ channelId: 'channel-123' })
			expect(logEntry.responseData).toEqual({ messageId: 'msg-123' })
			expect(logEntry.errorMessage).toBe('Error occurred')
			expect(logEntry.timestamp).toBeInstanceOf(Date)
		})

		it('should accept all log statuses', () => {
			const success: IntegrationLogEntry['status'] = 'success'
			const error: IntegrationLogEntry['status'] = 'error'
			const pending: IntegrationLogEntry['status'] = 'pending'

			expect(success).toBe('success')
			expect(error).toBe('error')
			expect(pending).toBe('pending')
		})

		it('should accept all integration statuses', () => {
			const active: import('../../src/types').IntegrationStatus = 'active'
			const inactive: import('../../src/types').IntegrationStatus = 'inactive'
			const error: import('../../src/types').IntegrationStatus = 'error'
			const expired: import('../../src/types').IntegrationStatus = 'expired'

			expect(active).toBe('active')
			expect(inactive).toBe('inactive')
			expect(error).toBe('error')
			expect(expired).toBe('expired')
		})

		it('should accept all provider types', () => {
			const productivity: import('../../src/types').ProviderType =
				'productivity'
			const ticketing: import('../../src/types').ProviderType = 'ticketing'
			const communication: import('../../src/types').ProviderType =
				'communication'

			expect(productivity).toBe('productivity')
			expect(ticketing).toBe('ticketing')
			expect(communication).toBe('communication')
		})
	})

	describe('IntegrationProvider Interface', () => {
		it('should define required methods', () => {
			// This test verifies that the IntegrationProvider interface has the expected shape
			const mockProvider: IntegrationProvider = {
				name: 'test-provider',
				type: 'productivity',
				getAuthUrl: async () => 'https://auth.example.com',
				handleCallback: async () => ({ accessToken: 'token' }),
				refreshToken: async () => ({ accessToken: 'new-token' }),
				revokeToken: async () => {},
				getAvailableChannels: async () => [],
				postMessage: async () => {},
				validateConnection: async () => true,
			}

			expect(mockProvider.name).toBe('test-provider')
			expect(mockProvider.type).toBe('productivity')
			expect(typeof mockProvider.getAuthUrl).toBe('function')
			expect(typeof mockProvider.handleCallback).toBe('function')
			expect(typeof mockProvider.refreshToken).toBe('function')
			expect(typeof mockProvider.revokeToken).toBe('function')
			expect(typeof mockProvider.getAvailableChannels).toBe('function')
			expect(typeof mockProvider.postMessage).toBe('function')
			expect(typeof mockProvider.validateConnection).toBe('function')
		})

		it('should allow optional methods', () => {
			const minimalProvider: IntegrationProvider = {
				name: 'minimal-provider',
				type: 'communication',
				getAuthUrl: async () => 'https://auth.example.com',
				handleCallback: async () => ({ accessToken: 'token' }),
				getAvailableChannels: async () => [],
				postMessage: async () => {},
				validateConnection: async () => true,
				// refreshToken and revokeToken are optional
			}

			expect(minimalProvider.refreshToken).toBeUndefined()
			expect(minimalProvider.revokeToken).toBeUndefined()
		})
	})
})
