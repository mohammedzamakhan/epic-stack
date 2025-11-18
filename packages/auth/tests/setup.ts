import { beforeAll, afterEach, vi } from 'vitest'

// Configure test environment
beforeAll(() => {
	// Set test environment variables
	process.env.NODE_ENV = 'test'
	process.env.SESSION_SECRET = 'test-session-secret-key-32-chars-long'
	process.env.ROOT_APP = 'example.com'

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

// Reset after each test
afterEach(() => {
	vi.clearAllMocks()
})
