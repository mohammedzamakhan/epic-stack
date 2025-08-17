/**
 * Extended tests for NoteEventHandler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NoteEventHandler } from '../../src/note-event-handler'
import { integrationManager } from '../../src/integration-manager'
import { prisma } from '@repo/prisma'

// Mock integration manager
vi.mock('../../src/integration-manager', () => ({
	integrationManager: {
		handleNoteUpdate: vi.fn(),
		getOrganizationIntegrations: vi.fn(),
		getNoteConnections: vi.fn(),
	},
}))

// Mock prisma
vi.mock('@repo/prisma', () => ({
	prisma: {
		organizationNote: {
			findUnique: vi.fn(),
		},
		noteIntegrationConnection: {
			findMany: vi.fn(),
		},
		integrationLog: {
			findMany: vi.fn(),
		},
	},
}))

describe('NoteEventHandler - Extended Coverage', () => {
	let handler: NoteEventHandler
	const mockIntegrationManager = vi.mocked(integrationManager)
	const mockPrisma = vi.mocked(prisma)

	beforeEach(() => {
		handler = new NoteEventHandler()
		vi.clearAllMocks()

		// Setup default mocks
		mockIntegrationManager.getOrganizationIntegrations.mockResolvedValue([])
		mockIntegrationManager.getNoteConnections.mockResolvedValue([])
		mockPrisma.organizationNote.findUnique.mockResolvedValue({
			id: 'note-123',
			title: 'Test Note',
			content: 'Test content',
			organizationId: 'org-123',
			authorId: 'user-123',
			createdAt: new Date(),
			updatedAt: new Date(),
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('Error Handling', () => {
		it('should handle integration manager errors gracefully', async () => {
			// Setup mocks to trigger the error path
			mockIntegrationManager.getOrganizationIntegrations.mockResolvedValue([
				{ id: 'int-1', providerName: 'slack' } as any,
			])
			mockIntegrationManager.getNoteConnections.mockResolvedValue([
				{ id: 'conn-1', integrationId: 'int-1' } as any,
			])
			mockIntegrationManager.handleNoteUpdate.mockRejectedValue(
				new Error('Integration error'),
			)

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(false)
			expect(result.errors).toContain('Integration error')
			expect(result.connectionsNotified).toBe(0)
		})

		it('should handle missing note data', async () => {
			mockPrisma.organizationNote.findUnique.mockResolvedValue(null)

			const result = await handler.handleNoteCreated(
				'nonexistent-note',
				'user-123',
			)

			expect(result.success).toBe(false)
			expect(result.errors).toContain('Note not found')
			expect(mockIntegrationManager.handleNoteUpdate).not.toHaveBeenCalled()
		})

		it('should handle database errors', async () => {
			mockPrisma.organizationNote.findUnique.mockRejectedValue(
				new Error('Database error'),
			)

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(false)
			expect(result.errors).toContain('Database error')
		})
	})

	describe('Event Processing', () => {
		it('should process note created events with correct change type', async () => {
			// Setup mock to return integrations and connections
			mockIntegrationManager.getOrganizationIntegrations.mockResolvedValue([
				{ id: 'int-1', providerName: 'slack' } as any,
			])
			mockIntegrationManager.getNoteConnections.mockResolvedValue([
				{ id: 'conn-1', integrationId: 'int-1' } as any,
			])
			mockIntegrationManager.handleNoteUpdate.mockResolvedValue()

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(true)
			expect(result.connectionsNotified).toBe(1)
			expect(mockIntegrationManager.handleNoteUpdate).toHaveBeenCalledWith(
				'note-123',
				'created',
				'user-123',
			)
		})

		it('should process note updated events with correct change type', async () => {
			mockIntegrationManager.getOrganizationIntegrations.mockResolvedValue([
				{ id: 'int-1', providerName: 'slack' } as any,
			])
			mockIntegrationManager.getNoteConnections.mockResolvedValue([
				{ id: 'conn-1', integrationId: 'int-1' } as any,
			])
			mockIntegrationManager.handleNoteUpdate.mockResolvedValue()

			const result = await handler.handleNoteUpdated('note-123', 'user-123', {
				title: 'Old Title',
				content: 'Old Content',
			})

			expect(result.success).toBe(true)
			expect(result.connectionsNotified).toBe(1)
			expect(mockIntegrationManager.handleNoteUpdate).toHaveBeenCalledWith(
				'note-123',
				'updated',
				'user-123',
			)
		})

		it('should process note deleted events with correct change type', async () => {
			// Setup integrations first (required for deleted notes processing)
			mockIntegrationManager.getOrganizationIntegrations.mockResolvedValue([
				{ id: 'int-1', providerName: 'slack' } as any,
			])

			mockPrisma.noteIntegrationConnection.findMany.mockResolvedValue([
				{
					id: 'conn-1',
					integrationId: 'int-1',
					isActive: true,
					integration: { id: 'int-1' },
				} as any,
			])
			mockIntegrationManager.handleNoteUpdate.mockResolvedValue()

			const result = await handler.handleNoteDeleted('note-123', 'user-123', {
				title: 'Deleted Note',
				organizationId: 'org-123',
			})

			expect(result.success).toBe(true)
			expect(result.connectionsNotified).toBe(1)
			expect(mockIntegrationManager.handleNoteUpdate).toHaveBeenCalledWith(
				'note-123',
				'deleted',
				'user-123',
			)
		})
	})

	describe('Data Transformation', () => {
		it('should handle notes with empty content', async () => {
			mockPrisma.organizationNote.findUnique.mockResolvedValue({
				id: 'note-123',
				title: 'Test Note',
				content: '',
				organizationId: 'org-123',
				authorId: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(true)
			expect(mockPrisma.organizationNote.findUnique).toHaveBeenCalledWith({
				where: { id: 'note-123' },
				select: {
					id: true,
					organizationId: true,
					title: true,
					content: true,
				},
			})
		})

		it('should handle notes with null content', async () => {
			mockPrisma.organizationNote.findUnique.mockResolvedValue({
				id: 'note-123',
				title: 'Test Note',
				content: null,
				organizationId: 'org-123',
				authorId: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(true)
		})

		it('should handle very long note titles', async () => {
			const longTitle = 'A'.repeat(1000)
			mockPrisma.organizationNote.findUnique.mockResolvedValue({
				id: 'note-123',
				title: longTitle,
				content: 'Test content',
				organizationId: 'org-123',
				authorId: 'user-123',
				createdAt: new Date(),
				updatedAt: new Date(),
			})

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(true)
		})
	})

	describe('Concurrent Processing', () => {
		it('should handle multiple simultaneous events', async () => {
			// Setup different mock responses for different notes
			mockPrisma.organizationNote.findUnique
				.mockResolvedValueOnce({
					id: 'note-123',
					title: 'Test Note 1',
					content: 'Test content 1',
					organizationId: 'org-123',
					authorId: 'user-123',
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.mockResolvedValueOnce({
					id: 'note-456',
					title: 'Test Note 2',
					content: 'Test content 2',
					organizationId: 'org-123',
					authorId: 'user-456',
					createdAt: new Date(),
					updatedAt: new Date(),
				})

			const results = await Promise.all([
				handler.handleNoteCreated('note-123', 'user-123'),
				handler.handleNoteUpdated('note-456', 'user-456'),
			])

			expect(results).toHaveLength(2)
			expect(results[0].success).toBe(true)
			expect(results[1].success).toBe(true)
		})
	})

	describe('No Integrations Scenario', () => {
		it('should return success when no integrations exist', async () => {
			mockIntegrationManager.getOrganizationIntegrations.mockResolvedValue([])

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(true)
			expect(result.connectionsNotified).toBe(0)
			expect(mockIntegrationManager.handleNoteUpdate).not.toHaveBeenCalled()
		})

		it('should return success when no connections exist', async () => {
			mockIntegrationManager.getOrganizationIntegrations.mockResolvedValue([
				{ id: 'int-1', providerName: 'slack' } as any,
			])
			mockIntegrationManager.getNoteConnections.mockResolvedValue([])

			const result = await handler.handleNoteCreated('note-123', 'user-123')

			expect(result.success).toBe(true)
			expect(result.connectionsNotified).toBe(0)
			expect(mockIntegrationManager.handleNoteUpdate).not.toHaveBeenCalled()
		})
	})
})
