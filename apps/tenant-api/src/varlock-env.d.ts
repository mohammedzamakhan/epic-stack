declare module 'varlock/env' {
	export interface TypedEnvSchema {
		readonly PORT: string
		readonly JWT_SECRET: string
		readonly AUTH_HMAC_SECRET: string
		readonly INTERNAL_COMMAND_TOKEN: string
		readonly TENANT_OPERATOR_TOKEN: string
		readonly DATABASE_URL: string
		readonly APP_URL?: string
		readonly TENANT_DB_DIR?: string
		readonly DATA_REGION: string
		readonly ROOT_APP?: string
		readonly JOBS_CRON_WORKER_URL?: string
		readonly TENANT_API_URL?: string
		readonly TWILIO_ACCOUNT_SID?: string
		readonly TWILIO_AUTH_TOKEN?: string
		readonly TWILIO_FROM_NUMBER?: string
		readonly GLOBAL_SMS_CAP?: string
		readonly OCI_TENANCY_OCID?: string
		readonly OCI_USER_OCID?: string
		readonly OCI_FINGERPRINT?: string
		readonly OCI_PRIVATE_KEY?: string
		readonly OCI_REGION?: string
		readonly OCI_EMAIL_COMPARTMENT_ID?: string
		readonly OCI_EMAIL_SENDER_EMAIL?: string
		readonly OCI_EMAIL_SENDER_NAME?: string
		readonly OCI_EMAIL_SENDER_OCID?: string
		readonly OCI_EMAIL_LOG_OCID?: string
	}
}

export {}
