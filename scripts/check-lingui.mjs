#!/usr/bin/env node

/**
 * Validates that all apps using Lingui have complete translations.
 * Fails (exit code 1) if:
 * 1. Any translatable string in source code has not been extracted into locale catalogs.
 * 2. Any string in a non-source locale catalog is untranslated (empty msgstr).
 * 3. Any translation catalog (.po file) has unstaged changes when a commit is being created.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCatalogs } from '@lingui/cli/api'
import { getConfig } from '@lingui/conf'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// ANSI escape codes for clean terminal output
const red = (str) => `\x1b[31m${str}\x1b[0m`
const green = (str) => `\x1b[32m${str}\x1b[0m`
const yellow = (str) => `\x1b[33m${str}\x1b[0m`
const bold = (str) => `\x1b[1m${str}\x1b[0m`
const cyan = (str) => `\x1b[36m${str}\x1b[0m`

function findLinguiApps() {
	const appsDir = path.join(rootDir, 'apps')
	const entries = fs.readdirSync(appsDir, { withFileTypes: true })
	const apps = []

	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		const appPath = path.join(appsDir, entry.name)
		const configExists = [
			'lingui.config.ts',
			'lingui.config.js',
			'lingui.config.mjs',
		].some((cfg) => fs.existsSync(path.join(appPath, cfg)))
		if (configExists) {
			apps.push({
				name: entry.name,
				path: appPath,
				relativeDir: path.relative(rootDir, appPath),
			})
		}
	}

	return apps
}

function checkUnstagedCatalogFiles(appRelativeDir) {
	try {
		// Check if git is available and if there are staged changes
		const stagedFiles = execSync('git diff --cached --name-only', {
			cwd: rootDir,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		})
			.split('\n')
			.filter(Boolean)

		if (stagedFiles.length === 0) {
			return [] // Not in a git commit context or nothing staged
		}

		// Check if any .po files in this app have unstaged or untracked changes
		const unstagedModified = execSync('git diff --name-only', {
			cwd: rootDir,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		})
			.split('\n')
			.filter(Boolean)

		const untrackedFiles = execSync(
			'git ls-files --others --exclude-standard',
			{
				cwd: rootDir,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'ignore'],
			},
		)
			.split('\n')
			.filter(Boolean)

		const unstagedDiff = Array.from(
			new Set([...unstagedModified, ...untrackedFiles]),
		)

		const unstagedCatalogs = unstagedDiff.filter(
			(file) => file.startsWith(appRelativeDir) && file.endsWith('.po'),
		)

		return unstagedCatalogs
	} catch {
		return []
	}
}

async function validateApp(app) {
	const originalCwd = process.cwd()
	const appErrors = []

	try {
		process.chdir(app.path)
		const config = getConfig()
		const sourceLocale = config.sourceLocale || 'en'
		const targetLocales = config.locales.filter((loc) => loc !== sourceLocale)
		const catalogs = await getCatalogs(config)

		// Check for unstaged .po files
		const unstagedPoFiles = checkUnstagedCatalogFiles(app.relativeDir)
		if (unstagedPoFiles.length > 0) {
			for (const file of unstagedPoFiles) {
				appErrors.push({
					type: 'unstaged',
					message: `Catalog file modified but unstaged: ${file}`,
					file,
				})
			}
		}

		for (const catalog of catalogs) {
			// Extract messages from source files in-memory
			const collected = (await catalog.collect()) || {}
			const catalogByLocale = await catalog.readAll(config.locales)

			// 1. Check all collected messages from source code
			for (const [key, collectedItem] of Object.entries(collected)) {
				const origin = collectedItem.origin
					? collectedItem.origin.map(([f, l]) => `${f}:${l}`).join(', ')
					: 'unknown origin'
				const messageText = collectedItem.message || key

				// Check each locale
				for (const locale of config.locales) {
					const localeCatalog = catalogByLocale[locale]
					const catalogEntry = localeCatalog ? localeCatalog[key] : null

					if (!catalogEntry) {
						appErrors.push({
							type: 'missing_from_catalog',
							locale,
							key,
							message: messageText,
							origin,
						})
					} else if (locale !== sourceLocale) {
						const translation = catalogEntry.translation
						if (!translation || translation.trim() === '') {
							appErrors.push({
								type: 'untranslated',
								locale,
								key,
								message: messageText,
								origin,
							})
						}
					}
				}
			}

			// 2. Check existing messages in catalogs for non-source locales
			for (const locale of targetLocales) {
				const localeCatalog = catalogByLocale[locale] || {}
				for (const [key, item] of Object.entries(localeCatalog)) {
					if (item.obsolete) continue
					// If already collected and checked, skip to avoid duplicates
					if (collected[key]) continue

					const translation = item.translation
					if (!translation || translation.trim() === '') {
						const origin = item.origin
							? item.origin.map(([f, l]) => `${f}:${l}`).join(', ')
							: 'catalog'
						appErrors.push({
							type: 'untranslated',
							locale,
							key,
							message: item.message || key,
							origin,
						})
					}
				}
			}
		}
	} catch (err) {
		appErrors.push({
			type: 'error',
			message: `Failed to inspect app: ${err.message}`,
		})
	} finally {
		process.chdir(originalCwd)
	}

	return appErrors
}

async function main() {
	const startTime = Date.now()
	const apps = findLinguiApps()

	if (apps.length === 0) {
		console.log(yellow('No Lingui apps found to validate.'))
		process.exit(0)
	}

	let totalErrors = 0
	const resultsByApp = new Map()

	for (const app of apps) {
		const errors = await validateApp(app)
		resultsByApp.set(app, errors)
		totalErrors += errors.length
	}

	const elapsedMs = Date.now() - startTime

	if (totalErrors === 0) {
		const appList = apps.map((a) => cyan(a.relativeDir)).join(', ')
		console.log(
			`${green('✔')} Lingui translations complete across all apps (${appList}) ${yellow(`(${elapsedMs}ms)`)}`,
		)
		process.exit(0)
	}

	console.error(
		bold(
			red(
				`\n❌ Lingui translation check failed! Found ${totalErrors} issue(s):\n`,
			),
		),
	)

	for (const [app, errors] of resultsByApp.entries()) {
		if (errors.length === 0) continue

		console.error(
			bold(cyan(`● ${app.relativeDir} (${errors.length} issue(s))`)),
		)

		// Group errors by locale / type
		const grouped = new Map()
		for (const err of errors) {
			const groupKey =
				err.type === 'unstaged'
					? 'Unstaged catalog files'
					: `Locale: ${err.locale}`
			if (!grouped.has(groupKey)) grouped.set(groupKey, [])
			grouped.get(groupKey).push(err)
		}

		for (const [groupName, groupErrors] of grouped.entries()) {
			console.error(`  ${yellow(groupName)}:`)
			for (const err of groupErrors) {
				if (err.type === 'missing_from_catalog') {
					console.error(
						`    ${red('✖')} [Not in catalog] "${err.message}" ${cyan(`(key: ${err.key})`)}`,
					)
					console.error(`      Origin: ${err.origin}`)
				} else if (err.type === 'untranslated') {
					console.error(
						`    ${red('✖')} [Untranslated]   "${err.message}" ${cyan(`(key: ${err.key})`)}`,
					)
					console.error(`      Origin: ${err.origin}`)
				} else if (err.type === 'unstaged') {
					console.error(`    ${red('✖')} ${err.message}`)
				} else {
					console.error(`    ${red('✖')} ${err.message}`)
				}
			}
		}
		console.error('')
	}

	console.error(bold('To fix missing or untranslated strings:'))
	console.error('  1. Extract messages into catalogs:')
	console.error(cyan('     npm run lingui:extract'))
	console.error('  2. Provide translations in the corresponding .po files.')
	console.error('  3. Stage the updated .po files:')
	console.error(
		cyan(
			'     git add apps/*/locales/*.po apps/*/src/locales/*.po apps/*/app/locales/*.po\n',
		),
	)

	process.exit(1)
}

main().catch((err) => {
	console.error(
		red(`Unexpected error during Lingui check: ${err.stack || err.message}`),
	)
	process.exit(1)
})
