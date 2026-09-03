import { faker } from '@faker-js/faker'
import { and, db, eq, Feedback } from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('In-App Feedback & Notification Preferences', () => {
	test('Operators can submit in-app feedback from the sidebar and verify persistence', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Step 1: Open feedback modal from sidebar
		const feedbackSidebarBtn = page
			.getByRole('button', { name: /give feedback/i })
			.last()
		await expect(feedbackSidebarBtn).toBeVisible()
		await feedbackSidebarBtn.click()

		// Step 2: Verify modal opened
		const modal = page.getByRole('dialog')
		await expect(
			modal.getByRole('heading', { name: /give feedback/i }),
		).toBeVisible()

		// Step 3: Select positive sentiment and enter feedback text
		const positiveSentimentBtn = modal.getByRole('button', {
			name: /positive feedback/i,
		})
		await expect(positiveSentimentBtn).toBeVisible()
		await positiveSentimentBtn.click()

		const feedbackMessage = `Great experience with the dashboard! ${faker.string.alphanumeric(8)}`
		const feedbackTextarea = modal.getByPlaceholder(/your feedback/i)
		await expect(feedbackTextarea).toBeVisible()
		await feedbackTextarea.fill(feedbackMessage)

		// Step 4: Submit feedback
		const sendButton = modal.getByRole('button', {
			name: /^submit$/i,
		})
		await expect(sendButton).toBeVisible()
		await sendButton.click()

		// Modal should close
		await expect(modal).toBeHidden()

		// Step 5: Verify feedback was saved in database
		const [savedFeedback] = await db
			.select({
				id: Feedback.id,
				message: Feedback.message,
				type: Feedback.type,
				userId: Feedback.userId,
			})
			.from(Feedback)
			.where(
				and(
					eq(Feedback.userId, user.id),
					eq(Feedback.message, feedbackMessage),
				),
			)
			.limit(1)

		expect(savedFeedback).toBeTruthy()
		expect(savedFeedback?.type).toBe('POSITIVE')
		expect(savedFeedback?.message).toBe(feedbackMessage)
	})

	test('Operators can view and toggle workflow notification preferences', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/settings/notifications', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify page heading and notification card
		await expect(
			page.getByRole('heading', { name: /^settings$/i }),
		).toBeVisible()
		await expect(page.getByText('Notification Preferences')).toBeVisible()

		// Verify workflow rows are rendered
		await expect(
			page.getByText(/notifications when you are mentioned in a comment/i),
		).toBeVisible()
		await expect(
			page.getByText(/notifications when someone comments on your notes/i),
		).toBeVisible()

		// Locate the switches in the preferences card
		const switches = page.getByRole('switch')
		await expect(switches.first()).toBeVisible()

		const firstSwitch = switches.first()
		const initialChecked = await firstSwitch.getAttribute('aria-checked')

		// Toggle switch
		await firstSwitch.click()
		const expectedChecked = initialChecked === 'true' ? 'false' : 'true'
		await expect(firstSwitch).toHaveAttribute('aria-checked', expectedChecked)
	})
})
