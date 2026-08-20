import { z } from 'zod'
import { requireInternalCommandAuth } from '#app/utils/internal-command-auth.server.ts'
import { completeStorageMigration } from '#app/utils/storage-migration.server.ts'
import { type Route } from './+types/storage.migration.$migrationId.complete.ts'

const CompleteSchema = z.object({
	failed: z.boolean().optional(),
	error: z.string().optional(),
})

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 })
	}

	await requireInternalCommandAuth(request)

	const body = CompleteSchema.parse(await request.json())
	await completeStorageMigration({
		migrationId: params.migrationId,
		failed: body.failed,
		error: body.error,
	})

	return Response.json({ success: true })
}
