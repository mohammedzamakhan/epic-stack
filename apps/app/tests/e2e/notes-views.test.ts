import { faker } from '@faker-js/faker'
import { db, OrganizationNote, OrganizationNoteStatus } from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Notes Multi-View Modes & Kanban Board', () => {
	test('Operators can view notes in cards grid, search notes, switch to kanban board, and persist view mode', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		// Seed 2 distinct statuses for Kanban columns
		const [todoStatus] = await db
			.insert(OrganizationNoteStatus)
			.values({
				organizationId: org.id,
				name: 'Planned',
				color: '#3b82f6',
				position: 1,
			})
			.returning()

		const [doneStatus] = await db
			.insert(OrganizationNoteStatus)
			.values({
				organizationId: org.id,
				name: 'Completed',
				color: '#10b981',
				position: 2,
			})
			.returning()

		// Seed notes associated with each status
		const plannedNoteTitle = `Feature Alpha ${faker.string.alphanumeric(6)}`
		const completedNoteTitle = `Feature Omega ${faker.string.alphanumeric(6)}`

		await db.insert(OrganizationNote).values([
			{
				organizationId: org.id,
				createdById: user.id,
				title: plannedNoteTitle,
				content: 'Drafting requirements and design specs',
				statusId: todoStatus!.id,
				priority: 'high',
			},
			{
				organizationId: org.id,
				createdById: user.id,
				title: completedNoteTitle,
				content: 'Finished production deployment',
				statusId: doneStatus!.id,
				priority: 'low',
			},
		])

		// Navigate to notes
		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Step 1: Default Cards View verification
		const cardsTab = page.getByRole('tab', { name: /cards view/i })
		const kanbanTab = page.getByRole('tab', { name: /kanban board/i })
		await expect(cardsTab).toBeVisible()
		await expect(kanbanTab).toBeVisible()

		// Both notes should be rendered in cards view
		await expect(page.getByText(plannedNoteTitle)).toBeVisible()
		await expect(page.getByText(completedNoteTitle)).toBeVisible()

		// Step 2: Search filtering
		const searchInput = page.getByRole('searchbox', {
			name: /search notes/i,
		})
		await expect(searchInput).toBeVisible()
		await searchInput.fill(plannedNoteTitle)

		// Planned note should be visible, Completed note should disappear
		await expect(page.getByText(plannedNoteTitle)).toBeVisible()
		await expect(page.getByText(completedNoteTitle)).not.toBeVisible()

		// Clear search
		await searchInput.fill('')
		await expect(page.getByText(completedNoteTitle)).toBeVisible()

		// Step 3: Switch to Kanban Board View and wait for preference cookie response
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/notes') && res.request().method() === 'POST',
			),
			kanbanTab.click(),
		])

		// Verify Kanban column headers
		await expect(
			page.getByText('Planned', { exact: true }).first(),
		).toBeVisible()
		await expect(
			page.getByText('Completed', { exact: true }).first(),
		).toBeVisible()

		// Notes should be visible in the board
		await expect(page.getByText(plannedNoteTitle)).toBeVisible()
		await expect(page.getByText(completedNoteTitle)).toBeVisible()

		// Step 4: Verify cookie persistence on page reload
		await page.reload()
		await page.waitForLoadState('networkidle')

		// Kanban tab should still be active
		await expect(kanbanTab).toHaveAttribute('aria-selected', 'true')
		await expect(
			page.getByText('Planned', { exact: true }).first(),
		).toBeVisible()
		await expect(
			page.getByText('Completed', { exact: true }).first(),
		).toBeVisible()
	})
})
