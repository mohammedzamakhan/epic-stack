import { withPayload } from '@payloadcms/next/withPayload'

const NEXT_PUBLIC_SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3006'

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'cms.epic-startup.me',
    'cms.epic-startup.me:2999',
    'epic-startup.me',
    'epic-startup.me:2999',
    'localhost:3006',
    'localhost:2999',
    '127.0.0.1:2999',
  ],
  images: {
    remotePatterns: [NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
      const url = new URL(item)

      return {
        hostname: url.hostname,
        protocol: url.protocol.replace(':', ''),
      }
    }),
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/admin',
        permanent: false,
      },
    ]
  },
}

export default withPayload(nextConfig, {
  devBundleServerPackages: false,
})
