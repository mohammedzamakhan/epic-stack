#!/usr/bin/env node

import { spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

const DOCKER_COMPOSE_FILE = 'docker-compose.yml'
const MAX_RETRIES = 30
const RETRY_INTERVAL = 2000

function runCommand(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const proc = spawn(command, args, {
			stdio: 'inherit',
			shell: true,
			...options,
		})

		proc.on('close', (code) => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`Command failed with exit code ${code}`))
			}
		})

		proc.on('error', reject)
	})
}

async function checkDockerInstalled() {
	try {
		await runCommand('docker', ['--version'], { stdio: 'ignore' })
		return true
	} catch {
		return false
	}
}

async function checkDockerRunning() {
	try {
		await runCommand('docker', ['info'], { stdio: 'ignore' })
		return true
	} catch {
		return false
	}
}

async function waitForMongoDB() {
	console.log('⏳ Waiting for MongoDB to be ready...')

	for (let i = 0; i < MAX_RETRIES; i++) {
		try {
			await runCommand(
				'docker',
				[
					'exec',
					'epic-startup-mongodb',
					'mongosh',
					'--quiet',
					'--eval',
					'"db.runCommand({ ping: 1 })"',
				],
				{ stdio: 'ignore' },
			)
			console.log('✅ MongoDB is ready!')
			return true
		} catch {
			await setTimeout(RETRY_INTERVAL)
		}
	}

	console.warn('⚠️  MongoDB health check timed out, but continuing anyway...')
	return false
}

async function startServices() {
	console.log('🐳 Starting Docker services...')

	// Check if Docker is installed
	if (!(await checkDockerInstalled())) {
		console.error('❌ Docker is not installed.')
		console.error(
			'   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop',
		)
		process.exit(1)
	}

	// Check if Docker is running
	if (!(await checkDockerRunning())) {
		console.error('❌ Docker is not running.')
		console.error('   Please start Docker Desktop and try again.')
		process.exit(1)
	}

	try {
		// Start services in detached mode
		await runCommand('docker', [
			'compose',
			'-f',
			DOCKER_COMPOSE_FILE,
			'up',
			'-d',
		])

		// Wait for MongoDB to be ready
		await waitForMongoDB()

		console.log('✅ Docker services are running')
	} catch (error) {
		console.error('❌ Failed to start Docker services:', error.message)
		process.exit(1)
	}
}

async function stopServices() {
	console.log('🛑 Stopping Docker services...')

	try {
		await runCommand('docker', [
			'compose',
			'-f',
			DOCKER_COMPOSE_FILE,
			'down',
		])
		console.log('✅ Docker services stopped')
	} catch (error) {
		console.error('❌ Failed to stop Docker services:', error.message)
		process.exit(1)
	}
}

async function showLogs() {
	try {
		await runCommand('docker', [
			'compose',
			'-f',
			DOCKER_COMPOSE_FILE,
			'logs',
			'-f',
		])
	} catch (error) {
		console.error('❌ Failed to show logs:', error.message)
		process.exit(1)
	}
}

// Main execution
const command = process.argv[2] || 'start'

switch (command) {
	case 'start':
		await startServices()
		break
	case 'stop':
		await stopServices()
		break
	case 'logs':
		await showLogs()
		break
	default:
		console.error(`Unknown command: ${command}`)
		console.error('Usage: node docker-services.mjs [start|stop|logs]')
		process.exit(1)
}
