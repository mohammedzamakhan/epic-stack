import { createContext, type ServerBuild } from 'react-router'

const SERVER_BUILD_CONTEXT_KEY = Symbol.for(
	'epic_startup.app.serverBuildContext',
)

type GlobalWithServerBuildContext = typeof globalThis & {
	[SERVER_BUILD_CONTEXT_KEY]?: ReturnType<
		typeof createContext<ServerBuild | null>
	>
}

const g = globalThis as GlobalWithServerBuildContext

export const serverBuildContext =
	g[SERVER_BUILD_CONTEXT_KEY] ??
	(g[SERVER_BUILD_CONTEXT_KEY] = createContext<ServerBuild | null>(null))
