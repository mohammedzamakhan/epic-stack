/**
 * Mock Prisma client for testing
 */

import { vi } from 'vitest'

export const mockPrisma = {
	userOrganization: {
		findFirst: vi.fn(),
		findUnique: vi.fn(),
	},
}

// Mock the @repo/database module
vi.mock('@repo/database', () => ({
	prisma: mockPrisma,
}))
