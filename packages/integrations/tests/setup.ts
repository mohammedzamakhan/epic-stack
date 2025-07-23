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
  process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret-32-chars'
  
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
  logLevel: 'error'
}