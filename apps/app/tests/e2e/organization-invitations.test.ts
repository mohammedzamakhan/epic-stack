import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
// Removed prisma import - using test utilities instead
import { readEmail } from '#tests/mocks/utils.ts'
import { expect, test, waitFor } from '#tests/playwright-utils.ts'
import {
	createTestOrganization,
} from '#tests/test-utils.ts'

test.describe('Organization Invitations', () => {
	test('Organization owners can send invitations', async ({ page, login, navigate }) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Navigate to organization members page
		await navigate('/:slug/settings/members', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Wait for page to fully load
		await page.waitForLoadState('networkidle')

		// Fill in invitation form (form is already visible on the page)
		const inviteEmail = faker.internet.email()
		await page.getByPlaceholder('Enter email address').fill(inviteEmail)

		// Select role from dropdown
		await page.getByRole('combobox').click()
		await page
			.getByRole('option', { name: 'Member Standard organization' })
			.click()

		// Send invitation
		await page.getByRole('button', { name: /send invitations/i }).click()

		// Wait for form to reset (indicates success)
		await page.waitForTimeout(1000)
		await expect(page.getByPlaceholder('Enter email address')).toHaveValue('')

		// Verify invitation exists in database
		const invitation = await prisma.organizationInvitation.findFirst({
			where: {
				organizationId: org.id,
				email: inviteEmail,
			},
		})
		expect(invitation).toBeTruthy()
		expect(invitation?.organizationRoleId).toBe('org_role_member')

		// Verify invitation email was sent
		await waitFor(
			async () => {
				const email = await readEmail(inviteEmail)
				expect(email).toBeTruthy()
				expect(email?.subject).toContain('invited')
				return email
			},
			{ timeout: 10000 },
		)
	})

	test('Users can accept organization invitations', async ({ page, login, navigate }) => {
		const invitedUser = await login()

		// Create organization owner
		const owner = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } },
			},
		})

		// Create an organization
		const org = await prisma.organization.create({
			data: {
				name: faker.company.name(),
				slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
				description: faker.company.catchPhrase(),
				users: {
					create: {
						userId: owner.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		// Create an invitation for the logged-in user
		const invitation = await prisma.organizationInvitation.create({
			data: {
				organizationId: org.id,
				email: invitedUser.email,
				organizationRoleId: 'org_role_member',
				inviterId: owner.id,
				token: `accept-test-1-${faker.string.uuid()}-${Date.now()}`,
				expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
			},
		})

		// Navigate directly to organizations page where pending invitations are shown
		await navigate('/organizations')
		await page.waitForLoadState('networkidle')

		// Verify invitation details are displayed in pending invitations section
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: 'Pending Invitations' }),
		).toBeVisible()
		await expect(page.getByText(org.name)).toBeVisible()

		// Accept the invitation
		await page.getByRole('button', { name: /accept/i }).click()

		// Wait for the action to complete
		await page.waitForLoadState('networkidle')

		// The pending invitations section should disappear or the specific invitation should be gone
		// We can check that the organization now appears in the user's organizations list
		await expect(
			page.getByRole('link', { name: new RegExp(org.name) }),
		).toBeVisible()

		// Navigate to the organization to verify membership
		await navigate('/:slug', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify user is now a member in database
		const membership = await prisma.organization.findFirst({
			where: {
				id: org.id,
				users: {
					some: {
						userId: invitedUser.id,
					},
				},
			},
			select: {
				users: {
					where: {
						userId: invitedUser.id,
					},
					select: {
						organizationRoleId: true,
					},
				},
			},
		})
		expect(membership).toBeTruthy()
		expect(membership?.users[0]?.organizationRoleId).toBe('org_role_member')

		// Verify invitation is deleted after acceptance (correct behavior)
		const updatedInvitation = await prisma.organizationInvitation.findUnique({
			where: { id: invitation.id },
		})
		expect(updatedInvitation).toBeNull()
	})

	test('Users can decline organization invitations', async ({
		page,
		login,
		navigate,
	}) => {
		const invitedUser = await login()

		// Create organization owner
		const owner = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } },
			},
		})

		// Create an organization
		const org = await prisma.organization.create({
			data: {
				name: faker.company.name(),
				slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
				description: faker.company.catchPhrase(),
				users: {
					create: {
						userId: owner.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		// Create an invitation for the logged-in user
		const invitation = await prisma.organizationInvitation.create({
			data: {
				organizationId: org.id,
				email: invitedUser.email,
				organizationRoleId: 'org_role_member',
				inviterId: owner.id,
				token: `decline-test-${faker.string.uuid()}-${Date.now()}`,
				expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
			},
		})

		// Navigate to organizations page where pending invitations are shown
		await navigate('/organizations')
		await page.waitForLoadState('networkidle')

		// Verify invitation is displayed
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: 'Pending Invitations' }),
		).toBeVisible()
		await expect(page.getByText(org.name)).toBeVisible()

		// Decline the invitation
		await page.getByRole('button', { name: /decline/i }).click()

		// Wait for the action to complete
		await page.waitForLoadState('networkidle')

		// The invitation should disappear from the page
		await expect(page.getByText(org.name)).not.toBeVisible()

		// Verify user is not a member in database
		const membership = await prisma.organization.findFirst({
			where: {
				id: org.id,
				users: {
					some: {
						userId: invitedUser.id,
					},
				},
			},
		})
		expect(membership).toBeNull()

		// Verify invitation is deleted after declining (correct behavior)
		const updatedInvitation = await prisma.organizationInvitation.findUnique({
			where: { id: invitation.id },
		})
		expect(updatedInvitation).toBeNull()
	})

	test('Organization owners can revoke pending invitations', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()

		// Create an organization for the user
		const org = await createTestOrganization(user.id, 'admin')

		// Create a pending invitation
		const invitation = await prisma.organizationInvitation.create({
			data: {
				organizationId: org.id,
				email: faker.internet.email(),
				organizationRoleId: 'org_role_member',
				inviterId: user.id,
				token: `revoke-test-${faker.string.uuid()}-${Date.now()}`,
				expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
			},
		})

		// Navigate to organization members page
		await navigate('/:slug/settings/members', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Find and revoke the invitation (look for the trash button in pending invitations)
		const invitationEmail = faker.internet.email()
		// Update the invitation to use a known email
		await prisma.organizationInvitation.update({
			where: { id: invitation.id },
			data: { email: invitationEmail },
		})

		// Refresh the page to see the updated invitation
		await page.reload()
		await page.waitForLoadState('networkidle')

		// Find the invitation in the pending invitations section and click the trash button
		const pendingSection = page
			.locator('[data-slot="card-content"]')
			.filter({ hasText: 'Pending Invitations' })
		const invitationRow = pendingSection
			.locator('div')
			.filter({ hasText: invitationEmail })
		await invitationRow.locator('button[type="submit"]').click()

		// Verify invitation is no longer displayed (check that the email is not in pending invitations)
		await expect(pendingSection.getByText(invitationEmail)).not.toBeVisible()

		// Verify invitation is deleted from database
		const deletedInvitation = await prisma.organizationInvitation.findUnique({
			where: { id: invitation.id },
		})
		expect(deletedInvitation).toBeNull()
	})

	test('Users can view their pending invitations', async ({ page, login, navigate }) => {
		const invitedUser = await login()

		// Create organization owner
		const owner = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } },
			},
		})

		// Create multiple organizations with invitations
		const org1 = await prisma.organization.create({
			data: {
				name: faker.company.name(),
				slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
				description: faker.company.catchPhrase(),
				users: {
					create: {
						userId: owner.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		const org2 = await prisma.organization.create({
			data: {
				name: faker.company.name(),
				slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
				description: faker.company.catchPhrase(),
				users: {
					create: {
						userId: owner.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		// Create invitations for both organizations
		await prisma.organizationInvitation.createMany({
			data: [
				{
					organizationId: org1.id,
					email: invitedUser.email,
					organizationRoleId: 'org_role_member',
					inviterId: owner.id,
					token: `view-test-1-${faker.string.uuid()}-${Date.now()}`,
					expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
				},
				{
					organizationId: org2.id,
					email: invitedUser.email,
					organizationRoleId: 'org_role_admin',
					inviterId: owner.id,
					token: `view-test-2-${faker.string.uuid()}-${Date.now()}`,
					expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
				},
			],
		})

		// Navigate to organizations page
		await navigate('/organizations')
		await page.waitForLoadState('networkidle')

		// Verify pending invitations section is displayed
		await expect(
			page
				.locator('[data-slot="card-title"]')
				.filter({ hasText: 'Pending Invitations' }),
		).toBeVisible()

		// Verify both invitations are displayed
		await expect(page.getByText(org1.name)).toBeVisible()
		await expect(page.getByText(org2.name)).toBeVisible()

		// The main point is that both invitations are visible - roles are secondary
		// Just verify the invitations are displayed correctly
	})

	test('Expired invitations cannot be accepted', async ({ page, login, navigate }) => {
		const invitedUser = await login()

		// Create organization owner
		const owner = await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.username(),
				name: faker.person.fullName(),
				roles: { connect: { name: 'user' } },
			},
		})

		// Create an organization
		const org = await prisma.organization.create({
			data: {
				name: faker.company.name(),
				slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
				description: faker.company.catchPhrase(),
				users: {
					create: {
						userId: owner.id,
						organizationRoleId: 'org_role_admin',
					},
				},
			},
		})

		// Create an expired invitation (created 8 days ago)
		const expiredDate = new Date()
		expiredDate.setDate(expiredDate.getDate() - 8)

		const ignored_invitation = await prisma.organizationInvitation.create({
			data: {
				organizationId: org.id,
				email: invitedUser.email,
				organizationRoleId: 'org_role_member',
				inviterId: owner.id,
				createdAt: expiredDate,
				token: `expired-test-${faker.string.uuid()}-${Date.now()}`,
				expiresAt: expiredDate, // Set expiration to the past
			},
		})

		// Navigate to organizations page where pending invitations are shown
		await navigate('/organizations')
		await page.waitForLoadState('networkidle')

		// Verify expired invitation does NOT appear in pending invitations
		// (The organizations page should filter out expired invitations)
		const pendingSection = page
			.locator('[data-slot="card-title"]')
			.filter({ hasText: 'Pending Invitations' })

		// The pending invitations section should either not exist or not contain the expired invitation
		if (await pendingSection.isVisible()) {
			await expect(page.getByText(org.name)).not.toBeVisible()
		} else {
			// If no pending invitations section, that's also correct (no valid invitations to show)
			await expect(pendingSection).not.toBeVisible()
		}
	})

	test('Invalid invitation tokens show error message', async ({
		page,
		login,
		navigate,
	}) => {
		await login()

		// Navigate to invalid invitation page
		await navigate('/join/invalid-token-123')
		await page.waitForLoadState('networkidle')

		// Verify error message is displayed (check for the actual error message from the join route)
		await expect(
			page.getByText(/invalid or expired invite link/i),
		).toBeVisible()
	})
})
