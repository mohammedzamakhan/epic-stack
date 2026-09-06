import { db, eq, sql, WebsiteRedirect } from '@repo/database'
import { getClientIp } from '@repo/security'
import { type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import {
	checkRateLimit,
	createRateLimitResponse,
	PUBLIC_SITE_RATE_LIMIT,
} from '#app/utils/rate-limit.server.ts'

const RedirectHitSchema = z.object({
	id: z.string().min(1),
})

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 })
	}

	const clientIp = getClientIp(request)
	const rateLimitCheck = await checkRateLimit(
		{ type: 'ip', value: clientIp },
		PUBLIC_SITE_RATE_LIMIT,
	)

	if (!rateLimitCheck.allowed) {
		return createRateLimitResponse(rateLimitCheck.resetAt)
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 })
	}

	const parseResult = RedirectHitSchema.safeParse(body)
	if (!parseResult.success) {
		return Response.json({ error: 'Invalid payload' }, { status: 400 })
	}

	const { id } = parseResult.data

	await db
		.update(WebsiteRedirect)
		.set({
			hitCount: sql`${WebsiteRedirect.hitCount} + 1`,
			lastTriggeredAt: new Date(),
		})
		.where(eq(WebsiteRedirect.id, id))

	return Response.json({ ok: true })
}
