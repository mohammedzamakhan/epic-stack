import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'url'

import { buildConfig, type PayloadRequest } from 'payload'
import sharp from 'sharp'

import { defaultLexical } from '@/fields/defaultLexical'
import { Banner } from './Banner/config'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Users } from './collections/Users'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import {
  getCloudflareEnv,
  getCorsOrigins,
  getCsrfOrigins,
  getDatabaseAdapter,
  getMediaStoragePlugins,
} from './platform'
import { plugins } from './plugins'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const cloudflareEnv = await getCloudflareEnv()

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
  db: getDatabaseAdapter(cloudflareEnv),
  collections: [Pages, Posts, Media, Categories, Users],
  cors: getCorsOrigins(),
  csrf: getCsrfOrigins(),
  globals: [Header, Footer, Banner],
  plugins: [...plugins, ...getMediaStoragePlugins(cloudflareEnv)],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
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
