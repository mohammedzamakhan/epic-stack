/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

type EnvType = {
	MODE: string
	SENTRY_DSN: string
	ALLOW_INDEXING: string
}

declare var ENV: EnvType
declare global {
	var ENV: EnvType
}
