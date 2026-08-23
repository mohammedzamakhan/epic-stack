declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL?: string
      DATABASE_AUTH_TOKEN?: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL?: string
      VERCEL_URL?: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      CRON_SECRET?: string
      PREVIEW_SECRET?: string
      WEB_APP_URL?: string
      CMS_SEED_SECRET?: string
      R2_ACCESS_KEY_ID?: string
      R2_SECRET_ACCESS_KEY?: string
      R2_BUCKET_NAME?: string
      CLOUDFLARE_ACCOUNT_ID?: string
      CMS_USE_R2?: string
    }
  }
}

export {}
