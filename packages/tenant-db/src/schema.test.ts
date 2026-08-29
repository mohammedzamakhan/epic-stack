import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq, sql } from 'drizzle-orm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import os from 'node:os'
import * as schema from './schema.ts'
import {
	customers,
	marketingJourneys,
	journeyRuns,
	journeyStepExecutions,
	marketingCampaigns,
	marketingMessages,
} from './schema.ts'

describe('Tenant Database Schema & Drizzle Migrations', () => {
	let tempDir: string
	let dbPath: string
	let client: ReturnType<typeof createClient>
	let db: ReturnType<typeof drizzle<typeof schema>>

	beforeEach(async () => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-db-test-'))
		dbPath = path.join(tempDir, 'test.db')
		client = createClient({ url: `file:${dbPath}` })
		db = drizzle(client, { schema })

		const currentFile = fileURLToPath(import.meta.url)
		const pkgRoot = path.dirname(path.dirname(currentFile))
		const migrationsFolder = path.join(pkgRoot, 'drizzle')

		// Apply all Drizzle migrations
		await migrate(db, { migrationsFolder })
	})

	afterEach(() => {
		try {
			client.close()
			fs.rmSync(tempDir, { recursive: true, force: true })
		} catch {
			// ignore cleanup errors
		}
	})

	it('creates all tables from migrations successfully', async () => {
		const tables = await db.all<{ name: string }>(
			sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name`,
		)
		const tableNames = tables.map((t) => t.name)

		expect(tableNames).toContain('customers')
		expect(tableNames).toContain('journey_runs')
		expect(tableNames).toContain('journey_step_executions')
		expect(tableNames).toContain('marketing_campaigns')
		expect(tableNames).toContain('marketing_journeys')
		expect(tableNames).toContain('marketing_messages')
	})

	it('inserts and queries marketingJourneys with json graph definition', async () => {
		const graphData = {
			nodes: [
				{
					id: 't-1',
					type: 'trigger',
					data: { triggerType: 'phone_verified' },
				},
				{
					id: 'a-1',
					type: 'action_email',
					data: {
						subject: 'Welcome {{name}}',
						bodyHtml: '<p>Welcome!</p>',
					},
				},
			],
			edges: [{ id: 'e1', source: 't-1', target: 'a-1' }],
		}

		const insertResult = await db
			.insert(marketingJourneys)
			.values({
				name: 'Onboarding Welcome Flow',
				description: 'Automated welcome email after signup',
				status: 'active',
				triggerType: 'phone_verified',
				triggerConfig: JSON.stringify({ tag: 'new-user' }),
				graphJson: JSON.stringify(graphData),
				nodes: JSON.stringify(graphData.nodes),
				edges: JSON.stringify(graphData.edges),
				version: 1,
				publishedAt: new Date(),
			})
			.returning()

		const journey = insertResult[0]!
		expect(journey).toBeDefined()
		expect(journey.id).toBeTruthy()
		expect(journey.name).toBe('Onboarding Welcome Flow')
		expect(journey.status).toBe('active')
		expect(journey.triggerType).toBe('phone_verified')
		expect(journey.publishedAt).toBeInstanceOf(Date)

		const queried = await db.query.marketingJourneys.findFirst({
			where: eq(marketingJourneys.id, journey.id),
		})
		expect(queried?.name).toBe('Onboarding Welcome Flow')
	})

	it('handles complete journey execution lifecycle with runs and step executions', async () => {
		// 1. Create customer
		const customerResult = await db
			.insert(customers)
			.values({
				name: 'Fatima Al-Zahrani',
				email: 'fatima@example.sa',
				phone: '+966501234567',
				phoneVerified: true,
			})
			.returning()
		const customer = customerResult[0]!

		// 2. Create journey
		const journeyResult = await db
			.insert(marketingJourneys)
			.values({
				name: 'Post-Verification Flow',
				status: 'active',
				triggerType: 'phone_verified',
			})
			.returning()
		const journey = journeyResult[0]!

		// 3. Create run
		const runResult = await db
			.insert(journeyRuns)
			.values({
				journeyId: journey.id,
				customerId: customer.id,
				workflowInstanceId: 'cf-wf-inst-123456',
				status: 'running',
				triggerEvent: 'phone_verified',
				contextData: JSON.stringify({ device: 'mobile' }),
			})
			.returning()
		const run = runResult[0]!

		expect(run.status).toBe('running')
		expect(run.workflowInstanceId).toBe('cf-wf-inst-123456')

		// 4. Create step execution
		const stepResult = await db
			.insert(journeyStepExecutions)
			.values({
				runId: run.id,
				journeyId: journey.id,
				customerId: customer.id,
				nodeId: 'node-sms-welcome',
				nodeType: 'action_sms',
				status: 'completed',
				metadata: JSON.stringify({ sid: 'SM123456789' }),
				completedAt: new Date(),
			})
			.returning()
		const stepExec = stepResult[0]!

		expect(stepExec.status).toBe('completed')
		expect(stepExec.nodeId).toBe('node-sms-welcome')

		// 5. Query full relational tree via Drizzle relations
		const fullRun = await db.query.journeyRuns.findFirst({
			where: eq(journeyRuns.id, run.id),
			with: {
				journey: true,
				customer: true,
				stepExecutions: true,
			},
		})

		expect(fullRun).toBeDefined()
		expect(fullRun?.journey.name).toBe('Post-Verification Flow')
		expect(fullRun?.customer.name).toBe('Fatima Al-Zahrani')
		expect(fullRun?.stepExecutions).toHaveLength(1)
		expect(fullRun?.stepExecutions[0]?.nodeId).toBe('node-sms-welcome')

		// 6. Complete run
		await db
			.update(journeyRuns)
			.set({
				status: 'completed',
				completedAt: new Date(),
			})
			.where(eq(journeyRuns.id, run.id))

		const updatedRun = await db.query.journeyRuns.findFirst({
			where: eq(journeyRuns.id, run.id),
		})
		expect(updatedRun?.status).toBe('completed')
		expect(updatedRun?.completedAt).toBeInstanceOf(Date)
	})

	it('enforces foreign key cascading deletions from marketingJourneys to runs and steps', async () => {
		// Enable foreign keys
		await db.run(sql`PRAGMA foreign_keys = ON;`)

		const customerResult = await db
			.insert(customers)
			.values({ name: 'Ahmed', email: 'ahmed@example.com' })
			.returning()
		const customer = customerResult[0]!

		const journeyResult = await db
			.insert(marketingJourneys)
			.values({ name: 'Temporary Journey' })
			.returning()
		const journey = journeyResult[0]!

		const runResult = await db
			.insert(journeyRuns)
			.values({ journeyId: journey.id, customerId: customer.id })
			.returning()
		const run = runResult[0]!

		await db.insert(journeyStepExecutions).values({
			runId: run.id,
			journeyId: journey.id,
			customerId: customer.id,
			nodeId: 'step-1',
			nodeType: 'action_email',
		})

		// Delete journey -> should cascade to runs and steps
		await db
			.delete(marketingJourneys)
			.where(eq(marketingJourneys.id, journey.id))

		const remainingRuns = await db
			.select()
			.from(journeyRuns)
			.where(eq(journeyRuns.id, run.id))
		expect(remainingRuns).toHaveLength(0)

		const remainingSteps = await db
			.select()
			.from(journeyStepExecutions)
			.where(eq(journeyStepExecutions.runId, run.id))
		expect(remainingSteps).toHaveLength(0)
	})

	it('links marketingMessages outbox to journeyStepExecutions with set null on delete', async () => {
		await db.run(sql`PRAGMA foreign_keys = ON;`)

		const customerResult = await db
			.insert(customers)
			.values({ name: 'Sara', email: 'sara@example.com' })
			.returning()
		const customer = customerResult[0]!

		const journeyResult = await db
			.insert(marketingJourneys)
			.values({ name: 'Promo Flow' })
			.returning()
		const journey = journeyResult[0]!

		const runResult = await db
			.insert(journeyRuns)
			.values({ journeyId: journey.id, customerId: customer.id })
			.returning()
		const run = runResult[0]!

		const stepResult = await db
			.insert(journeyStepExecutions)
			.values({
				runId: run.id,
				journeyId: journey.id,
				customerId: customer.id,
				nodeId: 'email-promo',
				nodeType: 'action_email',
			})
			.returning()
		const step = stepResult[0]!

		const messageResult = await db
			.insert(marketingMessages)
			.values({
				customerId: customer.id,
				journeyStepExecutionId: step.id,
				channel: 'email',
				status: 'Sent',
			})
			.returning()
		const message = messageResult[0]!

		expect(message.journeyStepExecutionId).toBe(step.id)

		// Delete step execution -> marketingMessage remains with journeyStepExecutionId = null
		await db
			.delete(journeyStepExecutions)
			.where(eq(journeyStepExecutions.id, step.id))

		const updatedMessage = await db.query.marketingMessages.findFirst({
			where: eq(marketingMessages.id, message.id),
		})
		expect(updatedMessage).toBeDefined()
		expect(updatedMessage?.journeyStepExecutionId).toBeNull()
	})

	it('provisions and destroys a tenant database using provisionTenantDb & destroyTenantDb', async () => {
		const orgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenant-prov-test-'))
		const originalTenantDir = process.env.TENANT_DB_DIR
		process.env.TENANT_DB_DIR = orgDir

		try {
			const { provisionTenantDb } = await import('./migrate.server.ts')
			const { destroyTenantDb, getTenantDb } = await import('./db.server.ts')

			const orgId = 'clw9x0a12000008l00abcdef'

			const provDb = (await provisionTenantDb(orgId)) as typeof db
			expect(provDb).toBeDefined()

			const tableList = await provDb.all<{ name: string }>(
				sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'marketing_journeys'`,
			)
			expect(tableList).toHaveLength(1)

			// Calling provision again is idempotent and returns the db
			const secondProv = (await provisionTenantDb(orgId)) as typeof db
			expect(secondProv).toBeDefined()

			// Query through getTenantDb
			const fetchedDb = await getTenantDb(orgId)
			expect(fetchedDb).toBeDefined()

			// Destroy tenant db
			await destroyTenantDb(orgId)
			const dbFileExists = fs.existsSync(
				path.join(orgDir, `tenant_${orgId}.db`),
			)
			expect(dbFileExists).toBe(false)
		} finally {
			if (originalTenantDir) {
				process.env.TENANT_DB_DIR = originalTenantDir
			} else {
				delete process.env.TENANT_DB_DIR
			}
			fs.rmSync(orgDir, { recursive: true, force: true })
		}
	})
})
