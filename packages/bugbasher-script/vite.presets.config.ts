import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		lib: {
			entry: 'src/ui-presets.ts',
			name: 'BugBasherUIPresets',
			fileName: 'ui-presets',
			formats: ['es', 'umd'],
		},
		outDir: 'dist',
		emptyOutDir: false, // Don't clear the dist directory
		minify: 'terser',
		sourcemap: true,
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			process.env.NODE_ENV || 'production',
		),
	},
})
