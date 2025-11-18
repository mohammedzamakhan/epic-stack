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

// Mock the @repo/prisma module
vi.mock('@repo/prisma', () => ({
	prisma: mockPrisma,
}))
