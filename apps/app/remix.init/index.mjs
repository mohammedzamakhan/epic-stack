import { execSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { $ } from 'execa'
import inquirer from 'inquirer'
import open from 'open'
import parseGitHubURL from 'parse-github-url'

const escapeRegExp = (string) =>
	// $& means the whole matched string
	string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getRandomString = (length) => crypto.randomBytes(length).toString('hex')
const getRandomString32 = () => getRandomString(32)

async function getEpicStartupVersion() {
	const response = await fetch(
		'https://api.github.com/repos/mohammedzamakhan/epic-startup/commits/main',
	)
	if (!response.ok) {
		throw new Error(
			`Failed to fetch Epic Startup version: ${response.status} ${response.statusText}`,
		)
	const data = await response.json()
	return {
		head: data.sha,
		date: data.commit.author.date,
}

export default async function main({ rootDirectory }) {
	const EXAMPLE_ENV_PATH = path.join(rootDirectory, '.env.example')
	const ENV_PATH = path.join(rootDirectory, '.env')
	const PKG_PATH = path.join(rootDirectory, 'package.json')
	const WRANGLER_PATH = path.join(rootDirectory, 'wrangler.jsonc')

	const appNameRegex = escapeRegExp('epic-startup-template')

	const DIR_NAME = path.basename(rootDirectory)
	const SUFFIX = getRandomString(2)

	const APP_NAME = (DIR_NAME + '-' + SUFFIX)
		// get rid of anything that's not allowed in an app name
		.replace(/[^a-zA-Z0-9-_]/g, '-')
		.toLowerCase()

	const [env, packageJsonString] = await Promise.all([
		fs.readFile(EXAMPLE_ENV_PATH, 'utf-8'),
		fs.readFile(PKG_PATH, 'utf-8'),
	])

	const newEnv = env.replace(
		/^SESSION_SECRET=.*$/m,
		`SESSION_SECRET="${getRandomString(16)}"`,
	)

	const packageJson = JSON.parse(packageJsonString)

	packageJson.name = APP_NAME
	delete packageJson.author
	delete packageJson.license

	// Add Epic Stack version information

	await Promise.all(fileOperationPromises)

	if (!process.env.SKIP_SETUP) {
		console.log(
			`🔧 Epic Stack is now configured for Cloudflare Workers deployment!`,
		)

		const { shouldSetupGitHub } = await inquirer.prompt([
			{
				name: 'shouldSetupGitHub',
				type: 'confirm',
				default: true,
				message:
					'Would you like to set up GitHub Actions for CI/CD to Cloudflare Workers?',
			},
		])

		if (shouldSetupGitHub) {
			console.log(
				`📋 Setting up GitHub Actions... You'll need a Cloudflare API token.`,
			)
			await open(`https://dash.cloudflare.com/profile/api-tokens`)
			await open(`${repoURL}/settings/secrets/actions/new`)

			console.log(
				`Once you're finished with setting the token, you should be good to add the remote, commit, and push!`,
			)
		} else {
			console.log(
				`You can set up GitHub Actions later. Check the docs for deployment instructions.`,
			)
		}

	console.log('All done 🎉 Happy building!')
}