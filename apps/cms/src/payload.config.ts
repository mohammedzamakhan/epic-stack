// storage-adapter-import-placeholder
import { sqliteAdapter } from '@payloadcms/db-sqlite'

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { buildConfig, type PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { Banner } from './Banner/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:.')) {
    return process.env.DATABASE_URL
  }
  const dataDir = path.resolve(dirname, '../data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  return `file:${path.resolve(dataDir, 'cms.db')}`
}

export default buildConfig({
  admin: {
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: sqliteAdapter({
    client: {
      url: getDatabaseUrl(),
    },
  }),
  collections: [Pages, Posts, Media, Categories, Users],
  cors: [
    getServerSideURL(),
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
    'https://glorious-space-spork-jr6jrp7r4p3p7pj-3000.app.github.dev',
  ].filter(Boolean),
  csrf: [
    getServerSideURL(),
    'https://cms.epic-startup.me:2999',
    'https://epic-startup.me:2999',
    'https://*.epic-startup.me:2999',
    'https://epic-startup.zama-887.workers.dev',
    'https://epic-startup-cms.zama-887.workers.dev',
    'http://localhost:3006',
    'http://localhost:2999',
  ].filter(Boolean),
  globals: [Header, Footer, Banner],
  plugins: [
    ...plugins,
    // R2 storage for media in production
    // In development, Payload uses default local storage (public/media directory)
    // The R2 bucket binding is provided by the Cloudflare Workers runtime
    // via wrangler.jsonc d1_databases / r2_buckets config
  ],
  secret: process.env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        if (!authHeader || !cronSecret) return false

        const expectedHeader = `Bearer ${cronSecret}`
        const hashA = crypto.createHash('sha256').update(authHeader).digest()
        const hashB = crypto.createHash('sha256').update(expectedHeader).digest()
        return crypto.timingSafeEqual(hashA, hashB)
      },
    },
    tasks: [],
  },
})
