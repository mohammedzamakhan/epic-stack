#!/usr/bin/env tsx

/**
 * This script generates the icon sprite and types for the UI package
 * Run with: npm run icons or tsx scripts/generate-icons.ts
 */

import { spawn } from 'child_process'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const projectRoot = path.resolve(__dirname, '..')

function runCommand(command: string, args: string[] = [], cwd: string = projectRoot): Promise<void> {
	return new Promise((resolve, reject) => {
		console.log(`Running: ${command} ${args.join(' ')}`)
		const proc = spawn(command, args, { 
			cwd, 
			stdio: 'inherit',
			shell: true 
		})

		proc.on('close', (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`Command failed with exit code ${code}`))
			}
		})

		proc.on('error', (error) => {
			reject(error)
		})
	})
}

async function generateIcons() {
	try {
		console.log('Generating icon sprite and types...')
		await runCommand('npx', ['vite', 'build', '--config', 'vite.config.ts'])
		console.log('✅ Icons generated successfully!')
	} catch (error) {
		console.error('❌ Failed to generate icons:', error)
		process.exit(1)
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	generateIcons()
}
