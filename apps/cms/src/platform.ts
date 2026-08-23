import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { r2Storage, type R2StorageOptions } from '@payloadcms/storage-r2'
import { s3Storage } from '@payloadcms/storage-s3'
import { type Plugin } from 'payload'

import { migrations } from '@/migrations'
import { getServerSideURL } from '@/utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

type D1Binding = NonNullable<Parameters<typeof sqliteD1Adapter>[0]['binding']>
type R2Binding = R2StorageOptions['bucket']

export type CmsCloudflareEnv = {
  D1?: D1Binding
  R2_BUCKET?: R2Binding
}

export function isVercelRuntime() {
  return Boolean(process.env.VERCEL)
}

/**
 * Worker bindings exist only on Cloudflare. Skip this on Vercel so the
 * OpenNext/wrangler imports never run in the Hobby build.
 */
export async function getCloudflareEnv(): Promise<CmsCloudflareEnv | null> {
  if (isVercelRuntime()) return null

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const ctx = await getCloudflareContext({ async: true })
    const env = ctx?.env as CmsCloudflareEnv | undefined
    if (!env?.D1 && !env?.R2_BUCKET) return null
    return env
  } catch {
    return null
  }
}

export function getDatabaseUrl() {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:.')) {
    return process.env.DATABASE_URL
  }
  const dataDir = path.resolve(dirname, '../data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return `file:${path.resolve(dataDir, 'cms.db')}`
}

export function getDatabaseAdapter(cloudflareEnv: CmsCloudflareEnv | null) {
  const url = getDatabaseUrl()
  const isRemoteSqlite =
    url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('wss://')

  // Same Turso URL works on Vercel and on a future Cloudflare Worker.
  // Only use D1 when there is no remote libsql URL.
  const adapterOptions = { prodMigrations: migrations }

  if (!isRemoteSqlite && cloudflareEnv?.D1) {
    return sqliteD1Adapter({ binding: cloudflareEnv.D1, ...adapterOptions })
  }

  const authToken = process.env.DATABASE_AUTH_TOKEN

  return sqliteAdapter({
    ...adapterOptions,
    client: authToken ? { url, authToken } : { url },
  })
}

export function getMediaStoragePlugins(cloudflareEnv: CmsCloudflareEnv | null): Plugin[] {
  if (cloudflareEnv?.R2_BUCKET) {
    return [
      r2Storage({
        alwaysInsertFields: true,
        bucket: cloudflareEnv.R2_BUCKET,
        collections: { media: true },
      }),
    ]
  }

  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID

  if (accessKeyId && secretAccessKey && bucket && accountId) {
    return [
      s3Storage({
        alwaysInsertFields: true,
        bucket,
        collections: { media: true },
        config: {
          credentials: { accessKeyId, secretAccessKey },
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          region: 'auto',
          requestChecksumCalculation: 'WHEN_REQUIRED',
          responseChecksumValidation: 'WHEN_REQUIRED',
        },
      }),
    ]
  }

  return []
}

function vercelOrigin() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return null
}

export function getCorsOrigins() {
  return [
    getServerSideURL(),
    vercelOrigin(),
    'https://cms.epic-startup.me:2999',
    'https://epic-startup.me:2999',
    'https://*.epic-startup.me:2999',
    'https://epic-startup.zama-887.workers.dev',
    'https://epic-startup-cms.zama-887.workers.dev',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3006',
    'http://localhost:2999',
    'https://*.vercel.app',
  ].filter((origin): origin is string => Boolean(origin))
}

export function getCsrfOrigins() {
  return [
    getServerSideURL(),
    vercelOrigin(),
    'https://cms.epic-startup.me:2999',
    'https://epic-startup.me:2999',
    'https://*.epic-startup.me:2999',
    'https://epic-startup.zama-887.workers.dev',
    'https://epic-startup-cms.zama-887.workers.dev',
    'http://localhost:3006',
    'http://localhost:2999',
    'https://*.vercel.app',
  ].filter((origin): origin is string => Boolean(origin))
}
