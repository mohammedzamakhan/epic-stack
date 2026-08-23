/// <reference types="@cloudflare/workers-types" />

interface Env {
	DB: D1Database
	CACHE: KVNamespace
	ASSETS: Fetcher
	NODE_ENV: string
	ALLOW_INDEXING: string
	BASE_URL: string
	LAUNCH_STATUS: string
	AWS_REGION: string
	AWS_ENDPOINT_URL_S3: string
	BUCKET_NAME: string
	AWS_ACCESS_KEY_ID: string
	SENTRY_DSN: string
	FLY_REGION: string
	FLY_APP_NAME: string
	SESSION_SECRET: string
	HONEYPOT_SECRET: string
	INTERNAL_COMMAND_TOKEN: string
	SSO_ENCRYPTION_KEY: string
	AUDIT_LOG_SECRET_KEY: string
	AWS_SECRET_ACCESS_KEY: string
	BETTERSTACK_API_KEY: string
	SENTRY_AUTH_TOKEN: string
}
