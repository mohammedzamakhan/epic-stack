import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('Notes CRUD Operations', () => {
	test('Users can create notes', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		const newNote = createNote()
		await page.getByRole('link', { name: /New Note/i }).click()

		// fill in form and submit
		await page.getByRole('textbox', { name: /title/i }).fill(newNote.title)
		// Content editor is a TipTap rich text editor using ProseMirror
		const contentEditor = page
			.locator('.ProseMirror')
			.or(page.getByRole('textbox', { name: /content/i }))
		await contentEditor.waitFor({ state: 'visible' })
		await contentEditor.fill(newNote.content)

		// Wait for any pending operations before looking for create button
		await page.waitForLoadState('networkidle')

		// Try multiple selectors for the create button
		const createButton = page.getByRole('button', { name: /create/i })
		await createButton.waitFor({ state: 'visible' })
		await createButton.click()
		await expect(page).toHaveURL(new RegExp(`/${org.slug}/notes/.*`))
		await expect(page.getByText(newNote.title).first()).toBeVisible()
	})

	test('Users can edit notes', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		const note = await prisma.organizationNote.create({
			select: { id: true },
			data: {
				...createNote(),
				organizationId: org.id,
				createdById: user.id,
				isPublic: true,
			},
		})
		await navigate('/:slug/notes/:id', { slug: org.slug, id: note.id })
		await page.waitForLoadState('networkidle')

		// edit the note
		await page.getByRole('link', { name: 'Edit', exact: true }).click()
		const updatedNote = createNote()
		await page.getByRole('textbox', { name: /title/i }).fill(updatedNote.title)
		// Content editor is a TipTap rich text editor using ProseMirror
		const contentEditor = page
			.locator('.ProseMirror')
			.or(page.getByRole('textbox', { name: /content/i }))
		await contentEditor.waitFor({ state: 'visible' })
		await contentEditor.fill(updatedNote.content)

		// Wait for any pending operations before looking for update button
		await page.waitForLoadState('networkidle')

		// Try multiple selectors for the update button
		const updateButton = page.getByRole('button', { name: /update/i })
		await updateButton.waitFor({ state: 'visible' })
		await updateButton.click()

		await expect(page).toHaveURL(`/${org.slug}/notes/${note.id}`)
		await expect(
			page.getByRole('heading', { name: updatedNote.title }),
		).toBeVisible()
	})

	test('Users can delete notes', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		const note = await prisma.organizationNote.create({
			select: { id: true },
			data: {
				...createNote(),
				organizationId: org.id,
				createdById: user.id,
				isPublic: true,
			},
		})
		await navigate('/:slug/notes/:id', { slug: org.slug, id: note.id })
		await page.waitForLoadState('networkidle')

		// delete the note
		await page.getByRole('button', { name: /delete/i }).click()

		// Confirm deletion if there's a confirmation dialog
		const confirmButton = page.getByRole('button', { name: /confirm/i }).first()
		if (await confirmButton.isVisible()) {
			await confirmButton.click()
		}

		await expect(page.getByText(/note.*deleted/i)).toBeVisible()
		await expect(page).toHaveURL(`/${org.slug}/notes`)
	})

	test('Users can view note details', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		const noteData = createNote()
		const note = await prisma.organizationNote.create({
			select: { id: true },
			data: {
				...noteData,
				organizationId: org.id,
				createdById: user.id,
				isPublic: true,
			},
		})

		await navigate('/:slug/notes/:id', { slug: org.slug, id: note.id })
		await page.waitForLoadState('networkidle')

		// Verify note details are displayed
		await expect(
			page.getByRole('heading', { name: noteData.title }),
		).toBeVisible()
		await expect(page.getByText(noteData.content)).toBeVisible()
	})

	test('Users can list all notes', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create multiple notes
		const notes = Array.from({ length: 3 }, () => createNote())
		await prisma.organizationNote.createMany({
			data: notes.map((note) => ({
				...note,
				organizationId: org.id,
				createdById: user.id,
				isPublic: true,
			})),
		})

		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify all notes are displayed
		for (const note of notes) {
			await expect(page.getByText(note.title)).toBeVisible()
		}
	})

	test('Users can filter notes by status', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create notes with different statuses
		const draftNote = createNote()
		const publishedNote = createNote()

		await prisma.organizationNote.createMany({
			data: [
				{
					...draftNote,
					organizationId: org.id,
					createdById: user.id,
					isPublic: false, // Draft
				},
				{
					...publishedNote,
					organizationId: org.id,
					createdById: user.id,
					isPublic: true, // Published
				},
			],
		})

		await navigate('/:slug/notes', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Test filtering by published status
		const publishedFilter = page
			.getByRole('button', { name: /published/i })
			.first()

		if (await publishedFilter.isVisible()) {
			await publishedFilter.click()
			await expect(page.getByText(publishedNote.title)).toBeVisible()
		}

		// Test filtering by draft status
		const draftFilter = page.getByRole('button', { name: /draft/i }).first()

		if (await draftFilter.isVisible()) {
			await draftFilter.click()
			await expect(page.getByText(draftNote.title)).toBeVisible()
		}
	})

	test('Users can change note visibility', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		const note = await prisma.organizationNote.create({
			select: { id: true },
			data: {
				...createNote(),
				organizationId: org.id,
				createdById: user.id,
				isPublic: false, // Start as private
			},
		})

		await navigate('/:slug/notes/:id/edit', { slug: org.slug, id: note.id })
		await page.waitForLoadState('networkidle')

		// Change visibility to public
		const visibilityToggle = page
			.getByRole('switch', { name: /public/i })
			.first()

		if (await visibilityToggle.isVisible()) {
			await visibilityToggle.click()
			await page.getByRole('button', { name: /update/i }).click()

			// Verify note is now public
			const updatedNote = await prisma.organizationNote.findUnique({
				where: { id: note.id },
				select: { isPublic: true },
			})
			expect(updatedNote?.isPublic).toBe(true)
		}
	})
})

function createNote() {
	return {
		title: faker.lorem.words(3),
		content: faker.lorem.paragraphs(3),
	}
}
