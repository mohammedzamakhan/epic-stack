export class WorkflowEntrypoint<Env = unknown, ignoredParams = unknown> {
	ctx: any
	env: Env
	constructor(ctx: any, env: Env) {
		this.ctx = ctx
		this.env = env
	}
}

export class WorkerEntrypoint<Env = unknown> {
	ctx: any
	env: Env
	constructor(ctx: any, env: Env) {
		this.ctx = ctx
		this.env = env
	}
}

export class RpcTarget {}

export type WorkflowEvent<T = unknown> = {
	payload: T
	instanceId?: string
	timestamp?: Date
}

export type WorkflowStep = {
	do: <T>(
		name: string,
		callbackOrConfig: any,
		maybeCallback?: any,
	) => Promise<T>
	sleep: (name: string, duration: string | number) => Promise<void>
	sleepUntil: (name: string, timestamp: Date | number) => Promise<void>
}
