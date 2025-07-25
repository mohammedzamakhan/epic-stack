import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './utils/mocks'

// Setup MSW server
export const server = setupServer(...handlers)

// Configure test environment
beforeAll(() => {
	// Start MSW server
	server.listen({ onUnhandledRequest: 'error' })

	// Set test environment variables
	process.env.NODE_ENV = 'test'
	process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters'
	process.env.INTEGRATION_ENCRYPTION_KEY = 'test-encryption-key-32-characters'
	process.env.INTEGRATIONS_OAUTH_STATE_SECRET =
		'test-oauth-state-secret-32-chars'

	// Provider-specific environment variables
	process.env.SLACK_CLIENT_ID = 'test-slack-client-id'
	process.env.SLACK_CLIENT_SECRET = 'test-slack-client-secret'
	process.env.JIRA_CLIENT_ID = 'test-jira-client-id'
	process.env.JIRA_CLIENT_SECRET = 'test-jira-client-secret'
	process.env.ASANA_CLIENT_ID = 'test-asana-client-id'
	process.env.ASANA_CLIENT_SECRET = 'test-asana-client-secret'
	process.env.LINEAR_CLIENT_ID = 'test-linear-client-id'
	process.env.LINEAR_CLIENT_SECRET = 'test-linear-client-secret'
	process.env.GITHUB_CLIENT_ID = 'test-github-client-id'
	process.env.GITHUB_CLIENT_SECRET = 'test-github-client-secret'
	process.env.GITHUB_INTEGRATION_CLIENT_ID = 'test-github-integration-client-id'
	process.env.GITHUB_INTEGRATION_CLIENT_SECRET =
		'test-github-integration-client-secret'
	process.env.GITLAB_CLIENT_ID = 'test-gitlab-client-id'
	process.env.GITLAB_CLIENT_SECRET = 'test-gitlab-client-secret'
	process.env.NOTION_CLIENT_ID = 'test-notion-client-id'
	process.env.NOTION_CLIENT_SECRET = 'test-notion-client-secret'
	process.env.TRELLO_API_KEY = 'test-trello-api-key'
	process.env.TRELLO_API_SECRET = 'test-trello-api-secret'
	process.env.CLICKUP_CLIENT_ID = 'test-clickup-client-id'
	process.env.CLICKUP_CLIENT_SECRET = 'test-clickup-client-secret'

	// Mock console methods to reduce noise in tests
	global.console = {
		...console,
		log: vi.fn(),
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}
})

// Reset handlers after each test
afterEach(() => {
	server.resetHandlers()
	vi.clearAllMocks()
})

// Clean up after all tests
afterAll(() => {
	server.close()
})

// Global test configuration
declare global {
	var __TEST_CONFIG__: {
		mockApiResponses: boolean
		useInMemoryDb: boolean
		logLevel: 'error' | 'warn' | 'info' | 'debug'
	}
}

globalThis.__TEST_CONFIG__ = {
	mockApiResponses: true,
	useInMemoryDb: true,
	logLevel: 'error',
}
