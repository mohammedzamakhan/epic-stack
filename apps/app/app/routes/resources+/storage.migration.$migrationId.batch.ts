import { requireInternalCommandAuth } from '#app/utils/internal-command-auth.server.ts'
import { processStorageMigrationBatch } from '#app/utils/storage-migration.server.ts'
import { type Route } from './+types/storage.migration.$migrationId.batch.ts'

export async function action({ request, params }: Route.ActionArgs) {
	if (request.method !== 'POST') {
		return new Response('Method Not Allowed', { status: 405 })
	}

	await requireInternalCommandAuth(request)

	const batch = await processStorageMigrationBatch(params.migrationId)
	return Response.json(batch)
}
