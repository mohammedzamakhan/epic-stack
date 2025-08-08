import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx, ManifestV3Export } from '@crxjs/vite-plugin'
import * as manifest from './public/manifest.json'
import tailwindcss from '@tailwindcss/vite'

const devManifest: Partial<ManifestV3Export> = {
  host_permissions: ['http://localhost:5173/*'],
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'

  const finalManifest = {
    ...manifest,
    ...(isDev ? devManifest : {}),
  }

  return {
    build: {
      emptyOutDir: true,
      outDir: 'build',
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/chunk-[hash].js',
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        port: 5173,
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      crx({ manifest: finalManifest as ManifestV3Export }),
    ],
  }
})
