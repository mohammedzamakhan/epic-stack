import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization, createTestOrganizationWithMultipleUsers } from '#tests/test-utils.ts'
// Removed prisma import - using test utilities instead

test.describe('Search Functionality', () => {
	test('Users can search for notes by title', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create test notes with specific titles
		const searchableTitle = 'Important Project Meeting'
		const otherTitle = 'Random Daily Notes'

		await prisma.organizationNote.createMany({
			data: [
				{
					title: searchableTitle,
					content: 'Meeting notes about the project',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true
				},
				{
					title: otherTitle,
					content: 'Some other content',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true
				},
				{
					title: 'Another Important Document',
					content: 'More content here',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true
				}
			]
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Search for notes containing "Important"
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill('Important')
		await page.keyboard.press('Enter')

		// Wait for search results
		await page.waitForLoadState('networkidle')

		// Verify search results show only matching notes
		await expect(page.getByText(searchableTitle)).toBeVisible()
		await expect(page.getByText('Another Important Document')).toBeVisible()
		await expect(page.getByText(otherTitle)).not.toBeVisible()
	})

	test('Users can search for notes by content', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create test notes with specific content
		const searchableContent = 'This note contains specific keywords about React development'
		const otherContent = 'This is about Vue.js and Angular frameworks'

		await prisma.organizationNote.createMany({
			data: [
				{
					title: 'Frontend Development',
					content: searchableContent,
					organizationId: org.id,
					createdById: user.id,
					isPublic: true
				},
				{
					title: 'Backend Development',
					content: otherContent,
					organizationId: org.id,
					createdById: user.id,
					isPublic: true
				}
			]
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Search for notes containing "React"
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill('React')
		await page.keyboard.press('Enter')

		// Wait for search results
		await page.waitForLoadState('networkidle')

		// Verify search results show only matching notes
		await expect(page.getByText('Frontend Development')).toBeVisible()
		await expect(page.getByText('Backend Development')).not.toBeVisible()
	})

	test('Search shows no results message when no matches found', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create a test note
		await prisma.organizationNote.create({
			data: {
				title: 'Sample Note',
				content: 'Some basic content',
				organizationId: org.id,
				createdById: user.id,
				isPublic: true
			}
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Search for something that doesn't exist
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill('nonexistent-keyword-xyz')
		await page.keyboard.press('Enter')

		// Wait for search results
		await page.waitForLoadState('networkidle')

		// Verify no results message is displayed
		await expect(page.getByText(/no notes found/i)).toBeVisible()
		await expect(page.getByText('Sample Note')).not.toBeVisible()
	})

	test('Search is case insensitive', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create a test note with mixed case
		await prisma.organizationNote.create({
			data: {
				title: 'JavaScript Development Guide',
				content: 'This guide covers JavaScript fundamentals',
				organizationId: org.id,
				createdById: user.id,
				isPublic: true
			}
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Search using lowercase
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill('javascript')
		await page.keyboard.press('Enter')

		// Wait for search results
		await page.waitForLoadState('networkidle')

		// Verify the note is found despite case difference
		await expect(page.getByText('JavaScript Development Guide')).toBeVisible()
	})

	test('Search respects note permissions', async ({ page, login, navigate }) => {
		const user = await login()

		// Create another user
		const otherUser = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } }
			}
		})

		// Create an organization for both users
		const org = await createTestOrganizationWithMultipleUsers([{ userId: user.id, role: 'admin' }, { userId: otherUser.id, role: 'member' }])

		// Create notes with different visibility
		await prisma.organizationNote.createMany({
			data: [
				{
					title: 'Public Searchable Note',
					content: 'This is public and searchable',
					organizationId: org.id,
					createdById: otherUser.id,
					isPublic: true
				},
				{
					title: 'Private Searchable Note',
					content: 'This is private and searchable',
					organizationId: org.id,
					createdById: otherUser.id,
					isPublic: false
				}
			]
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Search for "searchable"
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill('searchable')
		await page.keyboard.press('Enter')

		// Wait for search results
		await page.waitForLoadState('networkidle')

		// Verify only public note is visible to the current user
		await expect(page.getByText('Public Searchable Note')).toBeVisible()
		await expect(page.getByText('Private Searchable Note')).not.toBeVisible()
	})

	test('Search input maintains value after search', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create a test note
		await prisma.organizationNote.create({
			data: {
				title: 'Test Note for Search',
				content: 'Content for testing search functionality',
				organizationId: org.id,
				createdById: user.id,
				isPublic: true
			}
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Perform search
		const searchTerm = 'Test'
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill(searchTerm)
		await page.keyboard.press('Enter')

		// Wait for search results
		await page.waitForLoadState('networkidle')

		// Verify search input still contains the search term
		await expect(searchInput).toHaveValue(searchTerm)
	})

	test('Search can be cleared to show all notes', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create multiple test notes
		await prisma.organizationNote.createMany({
			data: [
				{
					title: 'Searchable Note',
					content: 'This note will be found',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true
				},
				{
					title: 'Another Note',
					content: 'This note has different content',
					organizationId: org.id,
					createdById: user.id,
					isPublic: true
				}
			]
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify both notes are initially visible
		await expect(page.getByText('Searchable Note')).toBeVisible()
		await expect(page.getByText('Another Note')).toBeVisible()

		// Perform search to filter results
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill('Searchable')
		await page.keyboard.press('Enter')
		await page.waitForLoadState('networkidle')

		// Verify only matching note is visible
		await expect(page.getByText('Searchable Note')).toBeVisible()
		await expect(page.getByText('Another Note')).not.toBeVisible()

		// Clear search
		await searchInput.clear()
		await page.keyboard.press('Enter')
		await page.waitForLoadState('networkidle')

		// Verify both notes are visible again
		await expect(page.getByText('Searchable Note')).toBeVisible()
		await expect(page.getByText('Another Note')).toBeVisible()
	})

	test('Search works with special characters', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create a test note with special characters
		await prisma.organizationNote.create({
			data: {
				title: 'C++ Programming & Development',
				content: 'Notes about C++ and object-oriented programming',
				organizationId: org.id,
				createdById: user.id,
				isPublic: true
			}
		})

		// Navigate to organization notes page
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Search for content with special characters
		const searchInput = page.getByRole('searchbox', { name: /search/i })
		await searchInput.fill('C++')
		await page.keyboard.press('Enter')

		// Wait for search results
		await page.waitForLoadState('networkidle')

		// Verify the note is found
		await expect(page.getByText('C++ Programming & Development')).toBeVisible()
	})
})