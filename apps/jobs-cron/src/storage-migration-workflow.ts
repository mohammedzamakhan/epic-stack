import {
	WorkflowEntrypoint,
	type WorkflowEvent,
	type WorkflowStep,
} from 'cloudflare:workers'

export interface StorageMigrationWorkflowEnv {
	APP_BASE_URL: string
	INTERNAL_COMMAND_TOKEN: string
}

type MigrationBatchResponse = {
	done: boolean
	totalObjects: number
	processedObjects: number
	failedObjects: number
}

function appUrl(env: StorageMigrationWorkflowEnv, path: string) {
	return `${env.APP_BASE_URL.replace(/\/$/, '')}${path}`
}

async function appFetch(
	env: StorageMigrationWorkflowEnv,
	path: string,
	init?: RequestInit,
) {
	const response = await fetch(appUrl(env, path), {
		...init,
		headers: {
			Authorization: `Bearer ${env.INTERNAL_COMMAND_TOKEN}`,
			...init?.headers,
		},
	})

	if (!response.ok) {
		const body = await response.text().catch(() => '')
		throw new Error(
			`${path} failed: ${response.status} ${response.statusText}${body ? `\n${body}` : ''}`,
		)
	}

	return response
}

export class StorageMigrationWorkflow extends WorkflowEntrypoint<
	StorageMigrationWorkflowEnv,
	{ migrationId: string }
> {
	async run(event: WorkflowEvent<{ migrationId: string }>, step: WorkflowStep) {
		const { migrationId } = event.payload
		const env = this.env
		let processedSoFar = 0

		try {
			while (true) {
				const batch = await step.do(
					`process-batch-${processedSoFar}`,
					async () => {
						const response = await appFetch(
							env,
							`/resources/storage/migration/${migrationId}/batch`,
							{ method: 'POST' },
						)
						return response.json() as Promise<MigrationBatchResponse>
					},
				)

				if (batch.done) {
					break
				}

				processedSoFar = batch.processedObjects + batch.failedObjects
			}
		} catch (error) {
			await step.do('fail-migration', async () => {
				await appFetch(
					env,
					`/resources/storage/migration/${migrationId}/complete`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							failed: true,
							error: error instanceof Error ? error.message : String(error),
						}),
					},
				)
			})
			throw error
		}
	}
}
