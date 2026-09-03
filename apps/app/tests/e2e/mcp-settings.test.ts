import { faker } from '@faker-js/faker'
import { db, eq, MCPAuthorization } from '@repo/database'
import { expect, test } from '#tests/playwright-utils.ts'
import { createTestOrganization } from '#tests/test-utils.ts'

test.describe('MCP Settings & Tools', () => {
	test('Operators can view MCP server setup, switch client config tabs, and inspect available tools', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		await navigate('/:slug/mcp', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Verify page title
		await expect(
			page.getByRole('heading', { name: /^mcp server$/i }),
		).toBeVisible()

		// Verify MCP Server URL section
		await expect(page.getByText(/your mcp server url/i)).toBeVisible()

		// Verify Client setup tabs (Claude Desktop, Kiro IDE, Cursor)
		await expect(
			page.getByRole('tab', { name: /claude desktop/i }),
		).toBeVisible()
		await expect(page.getByRole('tab', { name: /kiro ide/i })).toBeVisible()
		await expect(page.getByRole('tab', { name: /cursor/i })).toBeVisible()

		// Switch to Cursor tab
		await page.getByRole('tab', { name: /cursor/i }).click()
		await expect(page.getByText(/cursor setup/i)).toBeVisible()
		await expect(page.getByText(new RegExp(org.slug)).first()).toBeVisible()

		// Switch to Kiro IDE tab
		await page.getByRole('tab', { name: /kiro ide/i }).click()
		await expect(page.getByText(/kiro ide setup/i)).toBeVisible()

		// Verify Available Tools section and expand find_user tool
		await expect(page.getByText(/available tools/i)).toBeVisible()
		const findUserTool = page.getByRole('button', { name: /find_user/i })
		await expect(findUserTool).toBeVisible()
		await findUserTool.click()

		// Verify tool details expanded
		await expect(
			page.getByText(/search query for user name or username/i),
		).toBeVisible()
	})

	test('Operators can view authorized clients, revoke an authorization, and see revoked status', async ({
		page,
		login,
		navigate,
	}) => {
		const user = await login()
		const org = await createTestOrganization(user.id, 'admin')

		const clientName = `Claude Desktop ${faker.string.alphanumeric(4)}`
		const [auth] = await db
			.insert(MCPAuthorization)
			.values({
				userId: user.id,
				organizationId: org.id,
				clientName,
				clientId: `client-${faker.string.alphanumeric(10)}`,
				isActive: true,
			})
			.returning({ id: MCPAuthorization.id })

		expect(auth).toBeTruthy()

		await navigate('/:slug/mcp', { slug: org.slug })
		await page.waitForLoadState('networkidle')

		// Locate client row in Authorized Clients table
		const clientRow = page.getByRole('row').filter({ hasText: clientName })
		await expect(clientRow).toBeVisible()
		await expect(clientRow.getByText(/^active$/i)).toBeVisible()

		// Click Revoke button
		const revokeBtn = clientRow.getByRole('button', { name: /^revoke$/i })
		await expect(revokeBtn).toBeVisible()
		await revokeBtn.click()

		// Verify Revoke Confirmation Dialog
		const dialog = page.getByRole('dialog')
		await expect(
			dialog.getByRole('heading', { name: /revoke authorization/i }),
		).toBeVisible()
		await expect(dialog.getByText(clientName)).toBeVisible()

		// Confirm revocation
		await dialog.getByRole('button', { name: /revoke access/i }).click()

		// Dialog should close
		await expect(
			dialog.getByRole('heading', { name: /revoke authorization/i }),
		).toBeHidden()

		// Status should update to Revoked in the table
		await expect(clientRow.getByText(/^revoked$/i).first()).toBeVisible()

		// Verify revocation persisted in database
		const [updatedAuth] = await db
			.select({ isActive: MCPAuthorization.isActive })
			.from(MCPAuthorization)
			.where(eq(MCPAuthorization.id, auth!.id))
			.limit(1)

		expect(updatedAuth?.isActive).toBe(false)
	})
})
