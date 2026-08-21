// litefs-js should be used server-side only. It imports `fs` which breaks Workers
// bundling, so we load it dynamically only on Fly production.
import { isCloudflareWorkerRuntime } from './runtime.ts'

export type InstanceInfo = {
	primaryInstance: string
	currentInstance: string
	currentIsPrimary: boolean
}

const LOCAL_INSTANCE_INFO: InstanceInfo = {
	currentInstance: 'local',
	primaryInstance: 'local',
	currentIsPrimary: true,
}

function isFlyProduction(): boolean {
	if (isCloudflareWorkerRuntime()) return false

	const fly = process.env.FLY
	if (fly === 'true' || fly === '1') return true

	return Boolean(process.env.FLY_APP_NAME)
}

let litefsModule: typeof import('litefs-js') | null = null
let litefsRemixModule: typeof import('litefs-js/remix') | null = null

async function getLitefsModule() {
	if (!litefsModule) {
		litefsModule = await import('litefs-js')
	}
	return litefsModule
}

async function getLitefsRemixModule() {
	if (!litefsRemixModule) {
		litefsRemixModule = await import('litefs-js/remix')
	}
	return litefsRemixModule
}

export async function getInstanceInfo(
	litefsDir?: string,
): Promise<InstanceInfo> {
	if (!isFlyProduction()) return LOCAL_INSTANCE_INFO
	return (await getLitefsModule()).getInstanceInfo(litefsDir)
}

export function getInstanceInfoSync(litefsDir?: string): InstanceInfo {
	if (!isFlyProduction()) return LOCAL_INSTANCE_INFO

	if (!litefsModule) {
		throw new Error(
			'getInstanceInfoSync requires litefs-js on Fly; call getInstanceInfo() first or await module init',
		)
	}

	return litefsModule.getInstanceInfoSync(litefsDir)
}

export async function getAllInstances(): Promise<
	Record<string, string | string[]>
> {
	if (!isFlyProduction()) return { local: 'local' }
	return (await getLitefsModule()).getAllInstances()
}

export function getInternalInstanceDomain(
	instance: string,
	port?: string | void,
): string {
	if (!isFlyProduction()) return `http://${instance}.local:8081`

	if (!litefsModule) {
		throw new Error(
			'getInternalInstanceDomain requires litefs-js on Fly; call getInstanceInfo() first',
		)
	}

	return litefsModule.getInternalInstanceDomain(instance, port)
}

export async function ensurePrimary(): Promise<boolean> {
	if (!isFlyProduction()) return true
	return (await getLitefsRemixModule()).ensurePrimary()
}

export async function ensureInstance(instance: string): Promise<true> {
	if (!isFlyProduction()) return true
	return (await getLitefsRemixModule()).ensureInstance(instance)
}

if (isFlyProduction()) {
	void getLitefsModule()
}
