import { Hono, type Context } from 'hono'
import { jwtVerify } from 'jose'
import {
	getTenantDb,
	customers,
	marketingCampaigns,
	marketingMessages,
	interpolateMergeTags,
} from '@repo/tenant-db'
import { getBearerToken, getOperatorToken } from '../lib/secrets.ts'
import { checkGlobalSendCap } from '../lib/rate-limit.ts'
import { count, eq } from 'drizzle-orm'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { sendSms } from '@repo/sms'
import {
	getOciMarketingMetrics,
	isOciEngagementLoggingConfigured,
} from '@repo/email'
import { sendTenantEmail } from '../lib/tenant-email.ts'
import { ensureEmailEngagementSynced } from '../services/email-engagement-sync.ts'

export const operatorRoutes = new Hono()

async function authenticateOperator(c: Context) {
	const token = getBearerToken(c.req.header('Authorization')) || null
	if (!token) {
		throw c.json({ error: 'Unauthorized' }, 401)
	}

	const operatorToken = getOperatorToken()
	if (operatorToken.length < 16) {
		throw c.json({ error: 'Not configured' }, 503)
	}

	let decoded: { orgId: string; role: string }
	try {
		const secret = new TextEncoder().encode(operatorToken)
		const { payload } = await jwtVerify(token, secret, {
			audience: 'tenant-api-operator',
		})
		decoded = payload as typeof decoded
	} catch {
		throw c.json({ error: 'Invalid or expired operator token' }, 401)
	}

	if (decoded.role !== 'operator') {
		throw c.json({ error: 'Invalid role' }, 403)
	}

	return decoded
}

const updateCustomerSchema = z.object({
	name: z.string().trim().min(1, 'Name is required').max(200),
	email: z
		.string()
		.trim()
		.max(320)
		.refine(
			(value) => value === '' || z.string().email().safeParse(value).success,
			'Invalid email address',
		)
		.transform((value) => (value === '' ? null : value)),
})

operatorRoutes.get('/customers', async (c) => {
	let auth
	try {
		auth = await authenticateOperator(c)
	} catch (response) {
		return response as Response
	}

	const { orgId } = auth
	try {
		const db = await getTenantDb(orgId)
		const orgCustomers = await db.select().from(customers).all()
		return c.json({ customers: orgCustomers })
	} catch (error) {
		console.error('Error fetching customers:', error)
		return c.json({ error: 'Tenant Database unavailable' }, 500)
	}
})

operatorRoutes.patch('/customers/:customerId', async (c) => {
	let auth
	try {
		auth = await authenticateOperator(c)
	} catch (response) {
		return response as Response
	}

	const { orgId } = auth
	const customerId = c.req.param('customerId')

	let body: z.infer<typeof updateCustomerSchema>
	try {
		body = updateCustomerSchema.parse(await c.req.json())
	} catch (error) {
		if (error instanceof z.ZodError) {
			return c.json(
				{ error: error.issues[0]?.message ?? 'Invalid request body' },
				400,
			)
		}
		return c.json({ error: 'Invalid request body' }, 400)
	}

	try {
		const db = await getTenantDb(orgId)
		const [updated] = await db
			.update(customers)
			.set({
				name: body.name,
				email: body.email,
				updatedAt: new Date(),
			})
			.where(eq(customers.id, customerId))
			.returning()

		if (!updated) {
			return c.json({ error: 'Customer not found' }, 404)
		}

		return c.json({ customer: updated })
	} catch (error) {
		console.error('Error updating customer:', error)
		return c.json({ error: 'Tenant Database unavailable' }, 500)
	}
})

operatorRoutes.get('/marketing/metrics', async (c) => {
	let auth
	try {
		auth = await authenticateOperator(c)
	} catch (response) {
		return response as Response
	}

	const { orgId } = auth
	try {
		await ensureEmailEngagementSynced(orgId)
		const db = await getTenantDb(orgId)
		const allEmails = await db.select().from(marketingMessages).all()
		const activeCampaigns = await db
			.select({ count: count() })
			.from(marketingCampaigns)
			.where(eq(marketingCampaigns.status, 'Processing'))
			.all()

		const emailsSent = allEmails.filter((message) =>
			['Sent', 'Opened', 'Clicked'].includes(message.status),
		).length
		const openCount = allEmails.filter(
			(e) => e.status === 'Opened' || e.status === 'Clicked',
		).length
		const clickCount = allEmails.filter((e) => e.status === 'Clicked').length

		let openRate = emailsSent > 0 ? (openCount / emailsSent) * 100 : 0
		let clickRate = emailsSent > 0 ? (clickCount / emailsSent) * 100 : 0
		let reportedEmailsSent = emailsSent

		const ociMetrics = await getOciMarketingMetrics()
		if (ociMetrics && !isOciEngagementLoggingConfigured()) {
			reportedEmailsSent = ociMetrics.emailsSent
			openRate = Number.parseFloat(ociMetrics.openRate)
			clickRate = Number.parseFloat(ociMetrics.clickRate)
		}

		return c.json({
			metrics: {
				emailsSent: reportedEmailsSent,
				openRate: openRate.toFixed(1),
				clickRate: clickRate.toFixed(1),
				activeCampaigns: activeCampaigns[0]?.count || 0,
			},
		})
	} catch (error) {
		console.error('Error fetching marketing metrics:', error)
		return c.json({ error: 'Tenant Database unavailable' }, 500)
	}
})

operatorRoutes.get('/marketing/campaigns', async (c) => {
	let auth
	try {
		auth = await authenticateOperator(c)
	} catch (response) {
		return response as Response
	}

	const { orgId } = auth
	try {
		const db = await getTenantDb(orgId)
		const campaigns = await db.select().from(marketingCampaigns).all()
		return c.json({ campaigns })
	} catch (error) {
		console.error('Error fetching marketing campaigns:', error)
		return c.json({ error: 'Tenant Database unavailable' }, 500)
	}
})

operatorRoutes.get('/marketing/campaigns/:campaignId', async (c) => {
	let auth
	try {
		auth = await authenticateOperator(c)
	} catch (response) {
		return response as Response
	}

	const { orgId } = auth
	const campaignId = c.req.param('campaignId')

	try {
		await ensureEmailEngagementSynced(orgId)
		const db = await getTenantDb(orgId)
		const [campaign] = await db
			.select()
			.from(marketingCampaigns)
			.where(eq(marketingCampaigns.id, campaignId))

		if (!campaign) {
			return c.json({ error: 'Campaign not found' }, 404)
		}

		const recipients = await db
			.select({
				id: marketingMessages.id,
				status: marketingMessages.status,
				sentAt: marketingMessages.sentAt,
				openedAt: marketingMessages.openedAt,
				clickedAt: marketingMessages.clickedAt,
				name: customers.name,
				email: customers.email,
				phone: customers.phone,
			})
			.from(marketingMessages)
			.innerJoin(customers, eq(marketingMessages.customerId, customers.id))
			.where(eq(marketingMessages.campaignId, campaignId))

		const segmentationRules = campaign.segmentationRules as
			{ audience?: string } | null | undefined

		return c.json({
			campaign: {
				id: campaign.id,
				name: campaign.name,
				status: campaign.status,
				channel: campaign.channel,
				subject: campaign.subject,
				content: campaign.content,
				targetAudienceCount: campaign.targetAudienceCount,
				audience: segmentationRules?.audience ?? 'all',
				createdAt: campaign.createdAt,
				scheduledAt: campaign.scheduledAt,
				recipients,
			},
		})
	} catch (error) {
		console.error('Error fetching marketing campaign:', error)
		return c.json({ error: 'Tenant Database unavailable' }, 500)
	}
})

const createCampaignSchema = z.object({
	name: z.string().min(1),
	channel: z.enum(['email', 'sms']),
	subject: z.string().optional(),
	content: z.string().min(1),
	audience: z.string().default('all'),
	scheduledAt: z.string().optional(),
})

operatorRoutes.post('/marketing/campaigns', async (c) => {
	let auth
	try {
		auth = await authenticateOperator(c)
	} catch (response) {
		return response as Response
	}

	const { orgId } = auth

	try {
		const body = await c.req.json()
		const parsed = createCampaignSchema.safeParse(body)
		if (!parsed.success) {
			return c.json(
				{ error: 'Invalid input', issues: parsed.error.issues },
				400,
			)
		}

		const { name, channel, subject, content, audience, scheduledAt } =
			parsed.data

		if (channel === 'email' && !subject) {
			return c.json({ error: 'Email campaigns require a subject' }, 400)
		}

		const db = await getTenantDb(orgId)

		const campaignId = randomUUID()
		const isScheduled = !!scheduledAt
		const status = isScheduled ? 'Scheduled' : 'Processing'

		// In a real generic SaaS, 'audience' could be a complex JSON filter.
		// For now we store it in segmentationRules.
		await db.insert(marketingCampaigns).values({
			id: campaignId,
			name,
			channel,
			subject: subject || null,
			content,
			status,
			segmentationRules: JSON.stringify({ audience }),
			scheduledAt: isScheduled ? new Date(scheduledAt) : null,
		})

		// Background dispatch (Fire and Forget)
		if (!isScheduled) {
			void dispatchCampaign(orgId, campaignId)
		}

		return c.json({ success: true, campaignId, status })
	} catch (error) {
		console.error('Error creating campaign:', error)
		return c.json({ error: 'Internal Server Error' }, 500)
	}
})

async function dispatchCampaign(orgId: string, campaignId: string) {
	try {
		const db = await getTenantDb(orgId)
		const campaignArr = await db
			.select()
			.from(marketingCampaigns)
			.where(eq(marketingCampaigns.id, campaignId))
			.all()
		const campaign = campaignArr[0]
		if (!campaign) return

		// 1. Fetch audience
		// Here, a real system parses `segmentationRules`. We assume 'all'.
		const allCustomers = await db.select().from(customers).all()

		// Update target audience count
		await db
			.update(marketingCampaigns)
			.set({ targetAudienceCount: allCustomers.length })
			.where(eq(marketingCampaigns.id, campaignId))

		let hitCap = false
		// 2. Dispatch
		for (const customer of allCustomers) {
			// Enforce the global send cap to prevent runaway Twilio/OCI costs.
			const cap = checkGlobalSendCap()
			if (cap.limited) {
				console.warn(
					`Campaign dispatch for ${campaignId} hit the global send cap; stopping early.`,
				)
				hitCap = true
				break
			}

			// Create outbox row
			const messageId = randomUUID()
			await db.insert(marketingMessages).values({
				id: messageId,
				campaignId,
				customerId: customer.id,
				status: 'Processing', // Or 'Sent'/'Failed' later
			})

			// Templating engine via standard interpolateMergeTags
			const parsedContent = interpolateMergeTags(campaign.content, customer, {})
			const parsedSubject = campaign.subject
				? interpolateMergeTags(campaign.subject, customer, {})
				: ''

			let deliveryStatus = 'Sent'
			try {
				if (campaign.channel === 'email') {
					if (!customer.email) throw new Error('No email address')
					const emailRes = await sendTenantEmail({
						to: customer.email,
						toName: customer.name,
						subject: parsedSubject || 'Notification',
						text: parsedContent,
						html: `<p>${parsedContent}</p>`,
						context: {
							orgId,
							campaignId,
							customerId: customer.id,
							messageId,
						},
					})
					if (emailRes.status === 'error') {
						throw new Error(emailRes.error.message)
					}
				} else if (campaign.channel === 'sms') {
					if (!customer.phone) throw new Error('No phone number')
					await sendSms({
						to: customer.phone,
						message: parsedContent,
					})
				}
			} catch (err) {
				console.error(`Failed to send to customer ${customer.id}`, err)
				deliveryStatus = 'Failed'
			}

			// Update outbox
			await db
				.update(marketingMessages)
				.set({ status: deliveryStatus })
				.where(eq(marketingMessages.id, messageId))
		}

		// Mark status
		await db
			.update(marketingCampaigns)
			.set({ status: hitCap ? 'Failed' : 'Completed' })
			.where(eq(marketingCampaigns.id, campaignId))
	} catch (error) {
		console.error(`Campaign dispatch failed for ${campaignId}`, error)
		const db = await getTenantDb(orgId)
		await db
			.update(marketingCampaigns)
			.set({ status: 'Failed' })
			.where(eq(marketingCampaigns.id, campaignId))
	}
}
