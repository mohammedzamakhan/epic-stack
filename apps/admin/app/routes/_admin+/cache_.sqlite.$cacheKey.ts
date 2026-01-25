import { invariantResponse } from '@epic-web/invariant'
import {
	ensureInstance,
	getAllInstances,
	getInstanceInfo,
} from '@repo/common/litefs'
import { cache } from '@repo/cache'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { type Route } from './+types/cache_.sqlite.$cacheKey.ts'

export async function loader({ request, params }: Route.LoaderArgs) {
	await requireUserWithRole(request, 'admin')
	const searchParams = new URL(request.url).searchParams
	const currentInstanceInfo = await getInstanceInfo()
	const allInstances = await getAllInstances()
	const instance =
		searchParams.get('instance') ?? currentInstanceInfo.currentInstance
	await ensureInstance(instance)

	const { cacheKey } = params
	invariantResponse(cacheKey, 'cacheKey is required')
	return {
		instance: {
			hostname: instance,
			region: allInstances[instance],
			isPrimary: currentInstanceInfo.primaryInstance === instance,
		},
		cacheKey,
		value: await cache.get(cacheKey),
	}
}
