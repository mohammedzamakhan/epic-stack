/**
 * Test fixtures for API responses and test data
 */

export const fixtures = {
	// Slack API fixtures
	slack: {
		oauthResponse: {
			ok: true,
			app_id: 'A1234567890',
			access_token: 'xoxb-test-slack-token',
			scope: 'channels:read,chat:write',
			team: {
				id: 'T1234567890',
				name: 'Test Team',
			},
			bot_user_id: 'U1234567890',
		},

		oauthErrorResponse: {
			ok: false,
			error: 'invalid_code',
		},

		channelsResponse: {
			ok: true,
			channels: [
				{
					id: 'C1234567890',
					name: 'general',
					is_private: false,
					is_archived: false,
					is_member: true,
					num_members: 10,
					purpose: {
						value: 'General discussion',
						creator: 'U1234567890',
						last_set: 1234567890,
					},
				},
				{
					id: 'C0987654321',
					name: 'random',
					is_private: false,
					is_archived: false,
					is_member: true,
					num_members: 5,
				},
			],
		},

		postMessageResponse: {
			ok: true,
			ts: '1234567890.123456',
		},
	},

	// Jira API fixtures
	jira: {
		oauthResponse: {
			access_token: 'test-jira-access-token',
			refresh_token: 'test-jira-refresh-token',
			expires_in: 3600,
			scope: 'read:jira-work write:jira-work',
		},

		oauthErrorResponse: {
			error: 'invalid_grant',
			error_description: 'Invalid authorization code',
		},

		currentUserResponse: {
			account_id: '123456:abcd-efgh-ijkl',
			name: 'Test User',
			email: 'test@example.com',
			picture: 'https://avatar.atlassian.com/test.png',
		},

		accessibleResourcesResponse: [
			{
				id: 'test-cloud-id',
				name: 'Test Jira Instance',
				url: 'https://test.atlassian.net',
				scopes: ['read:jira-work', 'write:jira-work'],
			},
		],

		projectsResponse: {
			values: [
				{
					id: '10001',
					key: 'TEST',
					name: 'Test Project',
					projectTypeKey: 'software',
					description: 'A test project for integration testing',
					lead: {
						accountId: '123456:abcd-efgh-ijkl',
						displayName: 'Test User',
					},
					avatarUrls: {
						'16x16':
							'https://test.atlassian.net/secure/projectavatar?size=xsmall&pid=10001',
						'24x24':
							'https://test.atlassian.net/secure/projectavatar?size=small&pid=10001',
						'32x32':
							'https://test.atlassian.net/secure/projectavatar?size=medium&pid=10001',
						'48x48':
							'https://test.atlassian.net/secure/projectavatar?size=large&pid=10001',
					},
				},
				{
					id: '10002',
					key: 'DEMO',
					name: 'Demo Project',
					projectTypeKey: 'business',
					description: 'Demo project for testing',
				},
			],
			total: 2,
			isLast: true,
		},

		projectResponse: {
			id: '10001',
			key: 'TEST',
			name: 'Test Project',
			projectTypeKey: 'software',
			description: 'A test project for integration testing',
			lead: {
				accountId: '123456:abcd-efgh-ijkl',
				displayName: 'Test User',
			},
		},

		createMetaResponse: {
			projects: [
				{
					id: '10001',
					key: 'TEST',
					name: 'Test Project',
					issuetypes: [
						{
							id: '10001',
							name: 'Task',
							description: 'A task that needs to be done',
							iconUrl:
								'https://test.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10318&avatarType=issuetype',
							subtask: false,
						},
						{
							id: '10002',
							name: 'Story',
							description: 'A user story',
							iconUrl:
								'https://test.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10315&avatarType=issuetype',
							subtask: false,
						},
					],
				},
			],
		},

		createIssueResponse: {
			id: '10100',
			key: 'TEST-1',
			self: 'https://test.atlassian.net/rest/api/3/issue/10100',
		},
	},

	// Test data fixtures
	testData: {
		messageData: {
			title: 'Test Note Title',
			content: 'This is the content of the test note.',
			author: 'Test Author',
			noteUrl: 'https://example.com/notes/123',
			changeType: 'created' as const,
		},

		oauthCallbackParams: {
			organizationId: 'org-123',
			code: 'test-auth-code',
			state: 'test-state-string',
		},

		tokenData: {
			accessToken: 'test-access-token',
			refreshToken: 'test-refresh-token',
			expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
			scope: 'read write',
		},

		integration: {
			id: 'integration-123',
			organizationId: 'org-123',
			providerName: 'mock',
			providerType: 'test',
			accessToken: 'encrypted-access-token',
			refreshToken: 'encrypted-refresh-token',
			tokenExpiresAt: new Date(Date.now() + 3600000),
			config: JSON.stringify({
				instanceUrl: 'https://test.atlassian.net',
				user: {
					accountId: '123456:abcd-efgh-ijkl',
					displayName: 'Test User',
				},
			}),
			isActive: true,
			lastSyncAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
		},

		connection: {
			id: 'connection-123',
			noteId: 'note-123',
			integrationId: 'integration-123',
			externalId: 'TEST',
			config: JSON.stringify({
				projectKey: 'TEST',
				projectName: 'Test Project',
				defaultIssueType: 'Task',
				includeNoteContent: true,
			}),
			isActive: true,
			lastPostedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	},
}
