import {
	db,
	eq,
	OrganizationNote,
	OrganizationNoteStatus,
} from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Kanban Status Columns Lifecycle & Customization', () => {
	test('Operators can add a new custom status column to the kanban board', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		// Seed a note so the organization has notes and displays the board view
		await db.insert(OrganizationNote).values({
			organizationId: org.id,
			createdById: user.id,
			title: 'Initial Note',
			content: 'Initial content',
		})

		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Switch to Kanban Board View if not active
		const kanbanTab = page.getByRole('tab', { name: /kanban board/i })
		await expect(kanbanTab).toBeVisible()
		if ((await kanbanTab.getAttribute('aria-selected')) !== 'true') {
			await kanbanTab.click()
		}

		// Click Add Column button
		const addColumnBtn = page.getByRole('button', { name: /add column/i })
		await expect(addColumnBtn).toBeVisible()
		await addColumnBtn.click()

		// Fill in column name
		const columnName = 'In Review'
		const nameInput = page.getByRole('textbox', { name: /column name/i })
		await expect(nameInput).toBeVisible()
		await nameInput.fill(columnName)

		// Submit creation and wait for response
		const createBtn = page.getByRole('button', { name: /^create$/i })
		await expect(createBtn).toBeVisible()

		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/notes/statuses') &&
					res.request().method() === 'POST',
			),
			createBtn.click(),
		])

		// Verify new column appears on the Kanban board
		await expect(
			page.getByText(columnName, { exact: true }).first(),
		).toBeVisible()

		// Verify database persistence
		const [dbStatus] = await db
			.select()
			.from(OrganizationNoteStatus)
			.where(eq(OrganizationNoteStatus.organizationId, org.id))
			.limit(1)

		expect(dbStatus).toBeTruthy()
		expect(dbStatus?.name).toBe(columnName)
	})

	test('Operators can delete a custom status column from the kanban board', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		// Seed a custom status
		const statusName = 'QA Testing'
		const [seededStatus] = await db
			.insert(OrganizationNoteStatus)
			.values({
				organizationId: org.id,
				name: statusName,
				color: '#f59e0b',
				position: 10,
			})
			.returning()

		if (!seededStatus) throw new Error('Seeded status not found')
		expect(seededStatus).toBeTruthy()

		// Seed a note so the board displays
		await db.insert(OrganizationNote).values({
			organizationId: org.id,
			createdById: user.id,
			title: 'Testing Note',
			content: 'Testing note content',
			statusId: seededStatus.id,
		})

		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Switch to Kanban Board View if not active
		const kanbanTab = page.getByRole('tab', { name: /kanban board/i })
		await expect(kanbanTab).toBeVisible()
		if ((await kanbanTab.getAttribute('aria-selected')) !== 'true') {
			await kanbanTab.click()
		}

		// Verify seeded column header is visible
		const columnHeader = page.getByText(statusName, { exact: true }).first()
		await expect(columnHeader).toBeVisible()

		// Locate delete button for the seeded status
		const deleteBtn = page.locator(
			`form[action*="/notes/status/${seededStatus.id}"] button`,
		)
		await expect(deleteBtn).toBeAttached()

		// First click triggers double-check confirmation
		await deleteBtn.dispatchEvent('click')
		await expect(deleteBtn).toHaveText(/are you sure\?/i)

		// Second click executes deletion
		await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes(`/notes/status/${seededStatus.id}`) &&
					res.request().method() === 'DELETE',
			),
			deleteBtn.dispatchEvent('click'),
		])

		// Verify column is gone from the board
		await expect(page.getByText(statusName, { exact: true })).not.toBeVisible()

		// Verify record is deleted from SQLite
		const [deletedStatus] = await db
			.select()
			.from(OrganizationNoteStatus)
			.where(eq(OrganizationNoteStatus.id, seededStatus.id))
			.limit(1)

		expect(deletedStatus).toBeUndefined()
	})
})
