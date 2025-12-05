#!/usr/bin/env node
/**
 * Interactive brand setup script
 * Prompts users to customize their brand assets during initial setup
 */

import {
	readFileSync,
	writeFileSync,
	copyFileSync,
	existsSync,
	mkdirSync,
} from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..')

// ANSI color codes for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[36m',
	gray: '\x1b[90m',
}

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`)
}

function createReadlineInterface() {
	return readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})
}

function question(rl, query) {
	return new Promise((resolve) => {
		rl.question(query, resolve)
	})
}

async function promptBrandInfo() {
	const rl = createReadlineInterface()

	log('\n🎨 Brand Customization Setup', 'bright')
	log('Customize your brand assets for all apps in the monorepo\n', 'gray')

	const brandName = await question(
		rl,
		`${colors.bright}Brand Name${colors.reset} (default: Epic Startup): `,
	)
	const shortName =
		(await question(
			rl,
			`${colors.bright}Short Name${colors.reset} (for mobile/app manifests, default: ${brandName || 'Epic Startup'}): `,
		)) ||
		brandName ||
		'Epic Startup'
	const tagline = await question(
		rl,
		`${colors.bright}Tagline${colors.reset} (default: Build your next startup even faster): `,
	)
	const description = await question(
		rl,
		`${colors.bright}Description${colors.reset} (default: A modern SaaS boilerplate...): `,
	)
	const url = await question(
		rl,
		`${colors.bright}Website URL${colors.reset} (default: https://epicstartup.com): `,
	)
	const supportEmail = await question(
		rl,
		`${colors.bright}Support Email${colors.reset} (default: support@epicstartup.com): `,
	)
	const twitterHandle = await question(
		rl,
		`${colors.bright}Twitter Handle${colors.reset} (default: @epicstartup): `,
	)

	rl.close()

	return {
		name: brandName || 'Epic Startup',
		shortName: shortName || brandName || 'Epic Startup',
		tagline: tagline || 'Build your next startup even faster',
		description:
			description ||
			`${brandName || 'Epic Startup'} is a modern SaaS boilerplate that helps developers and founders launch production-ready applications in minutes.`,
		url: url || 'https://epicstartup.com',
		supportEmail: supportEmail || 'support@epicstartup.com',
		twitterHandle: twitterHandle || '@epicstartup',
		companyName: brandName || 'Epic Startup',
	}
}

async function promptFavicon() {
	const rl = createReadlineInterface()

	log('\n Favicon Setup', 'bright')
	log('You can provide a favicon now or update it later in each app\n', 'gray')

	const faviconPath = await question(
		rl,
		`${colors.bright}Favicon path${colors.reset} (SVG file, or press Enter to skip): `,
	)

	rl.close()

	if (!faviconPath || faviconPath.trim() === '') {
		log('Skipping favicon setup. You can update favicons later in:', 'yellow')
		log('  - apps/app/app/assets/favicons/favicon.svg', 'gray')
		log('  - apps/admin/app/assets/favicons/favicon.svg', 'gray')
		log('  - apps/web/src/assets/favicons/favicon.svg', 'gray')
		log('  - apps/cms/public/favicon.svg', 'gray')
		log('  - apps/docs/favicon.svg', 'gray')
		return null
	}

	const resolvedPath = resolve(process.cwd(), faviconPath.trim())

	if (!existsSync(resolvedPath)) {
		log(`⚠️  File not found: ${resolvedPath}`, 'yellow')
		log(
			'Skipping favicon copy. You can update favicons manually later.',
			'yellow',
		)
		return null
	}

	return resolvedPath
}

function escapeString(str) {
	return str.replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function updateBrandConfig(brandInfo) {
	const brandPath = join(rootDir, 'packages/config/brand.ts')
	let content = readFileSync(brandPath, 'utf-8')

	const escapedName = escapeString(brandInfo.name)
	const escapedShortName = escapeString(brandInfo.shortName)
	const escapedTagline = escapeString(brandInfo.tagline)
	const escapedDescription = escapeString(brandInfo.description)
	const escapedCompanyName = escapeString(brandInfo.companyName)

	// Replace core brand identity (exact matches)
	content = content.replace(
		/\tname: 'Epic Startup',/g,
		`\tname: '${escapedName}',`,
	)
	content = content.replace(
		/\tshortName: 'Epic Startup',/g,
		`\tshortName: '${escapedShortName}',`,
	)
	content = content.replace(
		/\ttagline: 'Build your next startup even faster',/g,
		`\ttagline: '${escapedTagline}',`,
	)

	// Replace description (multiline)
	const descriptionPattern =
		/description:\s*\n\s*'Epic Startup is a modern SaaS boilerplate[^']*',/g
	content = content.replace(
		descriptionPattern,
		`description:\n\t\t'${escapedDescription}',`,
	)

	// Replace URLs and contact
	content = content.replace(
		/\turl: 'https:\/\/epicstartup\.com',/g,
		`\turl: '${brandInfo.url}',`,
	)
	content = content.replace(
		/\tsupportEmail: 'support@epicstartup\.com',/g,
		`\tsupportEmail: '${brandInfo.supportEmail}',`,
	)
	content = content.replace(
		/\ttwitterHandle: '@epicstartup',/g,
		`\ttwitterHandle: '${brandInfo.twitterHandle}',`,
	)

	// Replace company name
	content = content.replace(
		/\tcompanyName: 'Epic Startup',/g,
		`\tcompanyName: '${escapedCompanyName}',`,
	)

	// Replace product names in products object
	content = content.replace(
		/\t\tname: 'Epic Startup',/g,
		`\t\tname: '${escapedName}',`,
	)
	content = content.replace(
		/\t\tname: 'Epic Startup Admin',/g,
		`\t\tname: '${escapedName} Admin',`,
	)
	content = content.replace(
		/\t\tname: 'Epic Startup Extension',/g,
		`\t\tname: '${escapedName} Extension',`,
	)
	content = content.replace(
		/\t\tname: 'Epic Startup CMS',/g,
		`\t\tname: '${escapedName} CMS',`,
	)
	content = content.replace(
		/\t\tchrome: 'Epic Startup Chrome Extension',/g,
		`\t\tchrome: '${escapedName} Chrome Extension',`,
	)
	content = content.replace(
		/\t\tfirefox: 'Epic Startup Firefox Extension',/g,
		`\t\tfirefox: '${escapedName} Firefox Extension',`,
	)

	// Replace product descriptions that reference brand name
	content = content.replace(
		/\t\tdescription: 'Admin dashboard for Epic Startup',/g,
		`\t\tdescription: 'Admin dashboard for ${escapedName}',`,
	)
	content = content.replace(
		/\t\tdescription: 'Chrome extension for Epic Startup',/g,
		`\t\tdescription: 'Chrome extension for ${escapedName}',`,
	)
	content = content.replace(
		/\t\tdescription: 'Content management system for Epic Startup',/g,
		`\t\tdescription: 'Content management system for ${escapedName}',`,
	)

	// Replace email subjects
	content = content.replace(
		/\t\tpasswordReset: 'Epic Startup Password Reset',/g,
		`\t\tpasswordReset: '${escapedName} Password Reset',`,
	)
	content = content.replace(
		/\t\twelcome: 'Welcome to Epic Startup!',/g,
		`\t\twelcome: 'Welcome to ${escapedName}!',`,
	)
	content = content.replace(
		/\t\temailChange: 'Epic Startup Email Change Verification',/g,
		`\t\temailChange: '${escapedName} Email Change Verification',`,
	)

	// Replace AI system prompt
	content = content.replace(
		/You are an intelligent AI assistant for Epic Startup,/g,
		`You are an intelligent AI assistant for ${brandInfo.name},`,
	)

	writeFileSync(brandPath, content, 'utf-8')
	log(`✅ Updated ${brandPath}`, 'green')
}

function copyFavicon(faviconPath) {
	if (!faviconPath) return

	const faviconDestinations = [
		'apps/app/app/assets/favicons/favicon.svg',
		'apps/admin/app/assets/favicons/favicon.svg',
		'apps/web/src/assets/favicons/favicon.svg',
		'apps/web/public/favicons/favicon.svg',
		'apps/cms/public/favicon.svg',
		'apps/docs/favicon.svg',
	]

	let copiedCount = 0

	for (const dest of faviconDestinations) {
		const destPath = join(rootDir, dest)
		const destDir = dirname(destPath)

		try {
			if (!existsSync(destDir)) {
				mkdirSync(destDir, { recursive: true })
			}
			copyFileSync(faviconPath, destPath)
			copiedCount++
			log(`✅ Copied favicon to ${dest}`, 'green')
		} catch (error) {
			log(`⚠️  Failed to copy to ${dest}: ${error.message}`, 'yellow')
		}
	}

	if (copiedCount > 0) {
		log(`\n✅ Successfully copied favicon to ${copiedCount} locations`, 'green')
		log(
			'💡 Note: You may want to generate PNG versions (192x192, 512x512) for web manifests',
			'blue',
		)
	}
}

async function main() {
	try {
		// Check if SKIP_BRAND_SETUP is set
		if (process.env.SKIP_BRAND_SETUP === 'true') {
			log('Skipping brand setup (SKIP_BRAND_SETUP=true)', 'gray')
			return
		}

		// Check if running in non-interactive mode
		if (!process.stdin.isTTY) {
			log('Running in non-interactive mode. Skipping brand setup.', 'gray')
			log('Run "npm run setup:brand" later to customize your brand.', 'gray')
			return
		}

		const brandInfo = await promptBrandInfo()
		updateBrandConfig(brandInfo)

		const faviconPath = await promptFavicon()
		if (faviconPath) {
			copyFavicon(faviconPath)
		}

		log('\n✨ Brand setup complete!', 'green')
		log('Your brand configuration has been updated across all apps.', 'gray')
		log(
			'You can further customize brand settings in packages/config/brand.ts\n',
			'gray',
		)
	} catch (error) {
		// Handle Ctrl+C gracefully
		if (error.code === 'SIGINT' || error.message?.includes('SIGINT')) {
			log('\n\n⚠️  Setup cancelled by user', 'yellow')
			process.exit(0)
		}
		log(`\n❌ Error during brand setup: ${error.message}`, 'red')
		if (error.stack) {
			log(error.stack, 'gray')
		}
		process.exit(1)
	}
}

main()
