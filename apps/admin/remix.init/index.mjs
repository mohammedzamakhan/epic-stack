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

async function getEpicStartupVersion() {
	const response = await fetch(
		'https://api.github.com/repos/mohammedzamakhan/epic-startup/commits/main',
	)
	if (!response.ok) {
		throw new Error(
			`Failed to fetch Epic Startup version: ${response.status} ${response.statusText}`,
		)
	}
	const data = await response.json()
	return {
		head: data.sha,
		date: data.commit.author.date,
	}
}

export default async function main({ rootDirectory }) {
	const EXAMPLE_ENV_PATH = path.join(rootDirectory, '.env.example')
	const ENV_PATH = path.join(rootDirectory, '.env')
	const PKG_PATH = path.join(rootDirectory, 'package.json')
	const WRANGLER_PATH = path.join(rootDirectory, 'wrangler.jsonc')

	const wranglerNameRegex = escapeRegExp('epic-startup-admin')

	const DIR_NAME = path.basename(rootDirectory)
	const SUFFIX = getRandomString(2)

	const APP_NAME = (DIR_NAME + '-' + SUFFIX)
		// get rid of anything that's not allowed in an app name
		.replace(/[^a-zA-Z0-9-_]/g, '-')
		.toLowerCase()

	const [wranglerContent, env, packageJsonString] = await Promise.all([
		fs.readFile(WRANGLER_PATH, 'utf-8'),
		fs.readFile(EXAMPLE_ENV_PATH, 'utf-8'),
		fs.readFile(PKG_PATH, 'utf-8'),
	])

	const newEnv = env.replace(
		/^SESSION_SECRET=.*$/m,
		`SESSION_SECRET="${getRandomString(16)}"`,
	)

	const newWranglerContent = wranglerContent.replace(
		new RegExp(wranglerNameRegex, 'g'),
		APP_NAME,
	)

	const packageJson = JSON.parse(packageJsonString)

	packageJson.name = APP_NAME
	delete packageJson.author
	delete packageJson.license

	// Add Epic Stack version information
	try {
		const epicStartupVersion = await getEpicStartupVersion()
		packageJson['epic-startup'] = epicStartupVersion
	} catch (error) {
		console.warn(
			'Failed to fetch Epic Stack version information. The package.json will not include version details.',
			error,
		)
	}

	const fileOperationPromises = [
		fs.writeFile(WRANGLER_PATH, newWranglerContent),
		fs.writeFile(ENV_PATH, newEnv),
		fs.writeFile(PKG_PATH, JSON.stringify(packageJson, null, 2) + '\n'),
		fs.copyFile(
			path.join(rootDirectory, 'remix.init', 'gitignore'),
			path.join(rootDirectory, '.gitignore'),
		),
		fs.rm(path.join(rootDirectory, 'LICENSE.md')),
		fs.rm(path.join(rootDirectory, 'CONTRIBUTING.md')),
		fs.rm(path.join(rootDirectory, 'docs'), { recursive: true }),
		fs.rm(path.join(rootDirectory, 'tests/e2e/notes.test.ts')),
		fs.rm(path.join(rootDirectory, 'tests/e2e/search.test.ts')),
	]

	await Promise.all(fileOperationPromises)

	if (!process.env.SKIP_SETUP) {
		execSync('npm run setup', { cwd: rootDirectory, stdio: 'inherit' })
	}

	if (!process.env.SKIP_FORMAT) {
		execSync('npm run format -- --log-level warn', {
			cwd: rootDirectory,
			stdio: 'inherit',
		})
	}

	if (!process.env.SKIP_DEPLOYMENT) {
		await setupDeployment({ rootDirectory }).catch((error) => {
			console.error(error)

			console.error(
				`Looks like something went wrong setting up deployment. Sorry about that. Check the docs for instructions on how to get deployment setup yourself (https://github.com/mohammedzamakhan/epic-startup/blob/main/docs/deployment.md).`,
			)
		})
	}

	console.log(
		`
Setup is complete. You're now ready to rock and roll 🐨

What's next?

- Start development with \`npm run dev\`
- Run tests with \`npm run test\` and \`npm run test:e2e\`
		`.trim(),
	)
}

async function setupDeployment({ rootDirectory }) {
	const $I = $({ stdio: 'inherit', cwd: rootDirectory })

	const { shouldSetupDeployment } = await inquirer.prompt([
		{
			name: 'shouldSetupDeployment',
			type: 'confirm',
			default: true,
			message: 'Would you like to set up Cloudflare deployment right now?',
		},
	])

	if (!shouldSetupDeployment) {
		console.log(
			`Ok, check the docs (https://github.com/mohammedzamakhan/epic-startup/blob/main/docs/deployment.md) when you're ready to set that up.`,
		)
		return
	}

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
		console.log(`⛓ Initializing git repo...`)
		// it's possible there's already a git repo initialized so we'll just ignore
		// any errors and hope things work out.
		await $I`git init`.catch(() => {})

		console.log(
			`Opening repo.new. Please create a new repo and paste the URL below.`,
		)
		await open(`https://repo.new`)

		const { repoURL } = await inquirer.prompt([
			{
				name: 'repoURL',
				type: 'input',
				message: 'What is the URL of your repo?',
			},
		])

		const githubParts = parseGitHubURL(repoURL)

		if (!githubParts) {
			throw new Error(`Invalid GitHub URL: ${repoURL}`)
		}

		console.log(
			`📋 Opening Cloudflare API tokens and GitHub Action Secrets pages. Create a token with Workers edit permission and set it as CLOUDFLARE_API_TOKEN.`,
		)
		await open(`https://dash.cloudflare.com/profile/api-tokens`)
		await open(`${repoURL}/settings/secrets/actions/new`)

		console.log(
			`Once you're finished with setting the token, you should be good to add the remote, commit, and push!`,
		)
	}

	console.log('All done 🎉 Happy building!')
}
