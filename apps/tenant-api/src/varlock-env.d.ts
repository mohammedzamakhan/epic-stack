declare module 'varlock/env' {
	export interface TypedEnvSchema {
		readonly PORT: string
		readonly JWT_SECRET: string
		readonly AUTH_HMAC_SECRET: string
		readonly INTERNAL_COMMAND_TOKEN: string
		readonly DATABASE_URL: string
		readonly APP_URL?: string
		readonly TENANT_DB_DIR?: string
		readonly DATA_REGION: string
		readonly ROOT_APP?: string
	}
}

export {}
