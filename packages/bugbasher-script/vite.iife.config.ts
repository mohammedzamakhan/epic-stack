import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'src/iife-wrapper.ts',
			name: 'BugBasher',
			fileName: 'script.iife',
			formats: ['iife'],
		},
		rollupOptions: {
			output: {
				// Inline everything for IIFE
				inlineDynamicImports: true,
			},
		},
		outDir: 'dist/iife',
		minify: 'terser',
		sourcemap: true,
		target: 'es2020',
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'production',
		),
	},
})
