import { z } from 'zod'
import { requireInternalCommandAuth } from '#app/utils/internal-command-auth.server.ts'
import { reportStorageMigrationProgress } from '#app/utils/storage-migration.server.ts'
import { type Route } from './+types/storage.migration.$migrationId.progress.ts'

const ProgressSchema = z.object({
	processedCount: z.number().int().min(0),
	failedCount: z.number().int().min(0),
	errors: z
		.array(
			z.object({
				objectKey: z.string(),
				error: z.string(),
			}),
		)
		.optional(),
})

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 })
	}

	await requireInternalCommandAuth(request)

	const body = ProgressSchema.parse(await request.json())
	const result = await reportStorageMigrationProgress({
		migrationId: params.migrationId,
		processedCount: body.processedCount,
		failedCount: body.failedCount,
		errors: body.errors,
	})

	return Response.json({ success: true, ...result })
}
