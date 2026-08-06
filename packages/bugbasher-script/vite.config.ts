import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
	plugins: [preact()],
	build: {
		rollupOptions: {
			input: 'src/script.ts',
			output: {
				format: 'es',
				// Enable code splitting for lazy loading
				inlineDynamicImports: false,
				manualChunks: (id) => {
					// Bundle Preact with the toolbar
					if (id.includes('node_modules/preact')) {
						return 'toolbar'
					}
					// Create chunks based on file paths
					if (
						id.includes('toolbar-react.tsx') ||
						id.includes('components/toolbar')
					)
						return 'toolbar'
					if (id.includes('toolbar.ts')) return 'toolbar'
					if (id.includes('openreplay.ts')) return 'openreplay'
					if (id.includes('comment-system.ts')) return 'comment-system'
					if (id.includes('communication.ts')) return 'communication'
					if (id.includes('bugbasher.ts')) return 'bugbasher'
					// Everything else goes in the main chunk
					return undefined
				},
				// Ensure chunks are loaded from the same directory
				chunkFileNames: '[name].js',
				entryFileNames: 'script.js',
				assetFileNames: '[name].[ext]',
			},
			// Enable tree shaking
			treeshake: {
				moduleSideEffects: false,
			},
		},
		outDir: 'dist',
		minify: 'terser',
		sourcemap: true,
		// Optimize for smaller initial bundle
		target: 'es2020',
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'production',
		),
	},
})
