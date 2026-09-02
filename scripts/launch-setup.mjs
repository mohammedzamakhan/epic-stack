#!/usr/bin/env node
/**
 * Interactive first-time launch setup for Epic Startup.
 *
 * - Creates Cloudflare D1 / KV / R2 resources (optional)
 * - Writes launch.config.json for local patching
 * - Generates shared secrets in launch.secrets.json (gitignored)
 * - Prints GitHub Variables/Secrets commands
 * - Opens Cloudflare / GitHub setup pages (optional)
 *
 * Usage: npm run launch:setup
 *
 * @see docs/launch-checklist.md
 */

import { execSync, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { confirm, input } from '@inquirer/prompts'
import { CF_D1, CF_KV, CF_R2 } from './cloudflare-resource-names.mjs'
import { stagingHostnames } from './staging-hostnames.mjs'
import {
	inferLaunchConfig,
	mergeInferredBindings,
	printInferredSummary,
} from './wrangler-infer.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

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

function randomHex(bytes) {
	return crypto.randomBytes(bytes).toString('hex')
}

function openUrl(url) {
	const platform = process.platform
	try {
		if (platform === 'darwin') execSync(`open "${url}"`, { stdio: 'ignore' })
		else if (platform === 'win32')
			execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true })
		else execSync(`xdg-open "${url}"`, { stdio: 'ignore' })
	} catch {
		log(`Could not open browser. Visit: ${url}`, 'yellow')
	}
}

function generateSharedSecrets() {
	const sessionSecret = randomHex(16)
	const internalCommandToken = randomHex(16)
	const tenantOperatorToken = randomHex(16)
	const customerJwtSecret = randomHex(16)

	return {
		generatedAt: new Date().toISOString(),
		shared: {
			SESSION_SECRET: sessionSecret,
			HONEYPOT_SECRET: randomHex(16),
			INTERNAL_COMMAND_TOKEN: internalCommandToken,
			TENANT_OPERATOR_TOKEN: tenantOperatorToken,
			SSO_ENCRYPTION_KEY: randomHex(32),
			AUDIT_LOG_SECRET_KEY: randomHex(32),
		},
		app: {
			JWT_SECRET: randomHex(16),
			TENANT_CUSTOMER_JWT_SECRET: customerJwtSecret,
		},
		tenant_api: {
			JWT_SECRET: customerJwtSecret,
			AUTH_HMAC_SECRET: randomHex(16),
		},
		notes: [
			'SESSION_SECRET, HONEYPOT_SECRET, INTERNAL_COMMAND_TOKEN, TENANT_OPERATOR_TOKEN, SSO_ENCRYPTION_KEY, and AUDIT_LOG_SECRET_KEY must match on App and Admin.',
			'INTERNAL_COMMAND_TOKEN must also match jobs-cron and tenant-api.',
			'TENANT_CUSTOMER_JWT_SECRET (App) must equal JWT_SECRET on US tenant-api.',
			'Set these via wrangler secret put — never commit values to git.',
		],
	}
}

function patchEnvFile(envPath, replacements) {
	if (!existsSync(envPath)) return false
	let content = readFileSync(envPath, 'utf8')
	let changed = false
	for (const [key, value] of Object.entries(replacements)) {
		const pattern = new RegExp(`^${key}=.*$`, 'm')
		if (pattern.test(content)) {
			content = content.replace(pattern, `${key}="${value}"`)
			changed = true
		}
	}
	if (changed) writeFileSync(envPath, content)
	return changed
}

function runWrangler(args, cwd) {
	const result = spawnSync('npx', ['wrangler', ...args], {
		cwd,
		encoding: 'utf8',
		stdio: ['inherit', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(
			result.stderr || result.stdout || `wrangler ${args.join(' ')} failed`,
		)
	}
	return result.stdout
}

function parseD1CreateOutput(output) {
	const idMatch = output.match(/database_id\s*=\s*"([^"]+)"/i)
	return idMatch?.[1]
}

function parseKvCreateOutput(output) {
	const idMatch = output.match(/id\s*=\s*"([^"]+)"/i)
	return idMatch?.[1]
}

function ghAvailable() {
	try {
		execSync('gh auth status', { stdio: 'ignore' })
		return true
	} catch {
		return false
	}
}

function applyRemoteD1Migrations(config) {
	const prodId = config.bindings.production.app.d1_database_id
	const stagingId = config.bindings.staging.app.d1_database_id
	if (!prodId && !stagingId) {
		log('\nSkipping remote D1 migrations (no App/Admin database IDs in config).', 'gray')
		return
	}

	log('\nApplying control-plane D1 migrations to Cloudflare…', 'yellow')
	const appDir = join(rootDir, 'apps/app')
	const patchScript = join(rootDir, 'scripts/patch-wrangler.mjs')
	// Always migrate via wrangler.deploy.jsonc — the Vite-built deploy config omits migrations_dir.
	const wranglerConfig = 'wrangler.deploy.jsonc'

	try {
		if (prodId) {
			execSync(`node "${patchScript}" --app app --env production`, {
				cwd: rootDir,
				stdio: 'inherit',
			})
			runWrangler(
				[
					'd1',
					'migrations',
					'apply',
					CF_D1.app,
					'--remote',
					'--config',
					wranglerConfig,
				],
				appDir,
			)
			log(`✅ Migrations applied to ${CF_D1.app} (production)`, 'green')
		}

		if (stagingId) {
			execSync(`node "${patchScript}" --app app --env staging`, {
				cwd: rootDir,
				stdio: 'inherit',
			})
			runWrangler(
				[
					'd1',
					'migrations',
					'apply',
					CF_D1.appStaging,
					'--remote',
					'--config',
					wranglerConfig,
					'--env',
					'staging',
				],
				appDir,
			)
			log(`✅ Migrations applied to ${CF_D1.appStaging} (staging)`, 'green')
		}
	} catch (error) {
		log(`\nRemote D1 migration failed: ${error.message}`, 'yellow')
		log(
			'Apply manually after patching: node scripts/patch-wrangler.mjs --app app --env production',
			'gray',
		)
		log(
			`  cd apps/app && npx wrangler d1 migrations apply ${CF_D1.app} --remote --config ${wranglerConfig}`,
			'gray',
		)
	}
}

const CF_BUILD_ENV = {
	NODE_OPTIONS: '--max-old-space-size=6144',
}

function runLaunchCommand(command, cwd, extraEnv = {}) {
	execSync(command, {
		cwd,
		stdio: 'inherit',
		env: { ...process.env, ...extraEnv },
	})
}

function patchWranglerApp(app, deployEnv) {
	const patchScript = join(rootDir, 'scripts/patch-wrangler.mjs')
	runLaunchCommand(`node "${patchScript}" --app ${app} --env ${deployEnv}`, rootDir)
}

function wranglerDeploy(cwd, configFile, deployEnv, { useEmptyEnv = false } = {}) {
	const envFlag = useEmptyEnv
		? ' --env=""'
		: deployEnv === 'staging'
			? ' --env staging'
			: ''
	runLaunchCommand(`npx wrangler deploy --config ${configFile}${envFlag}`, cwd)
}

function astroWranglerDeploy(appKey, deployEnv) {
	const appDir = join(rootDir, 'apps', appKey)
	const builtConfig = join(appDir, 'dist/server/wrangler.deploy.json')
	if (existsSync(builtConfig)) {
		wranglerDeploy(appDir, 'dist/server/wrangler.deploy.json', deployEnv, {
			useEmptyEnv: true,
		})
		return
	}
	wranglerDeploy(appDir, 'wrangler.deploy.toml', deployEnv, { useEmptyEnv: true })
}

function deployReactRouterApp(appKey, deployEnv, { build = true } = {}) {
	const appDir = join(rootDir, 'apps', appKey)
	if (build) {
		runLaunchCommand('npm run build:cf', appDir, CF_BUILD_ENV)
	}
	patchWranglerApp(appKey, deployEnv)
	wranglerDeploy(appDir, 'build/server/wrangler.deploy.json', deployEnv)
}

function deployJobsCron(deployEnv) {
	const appDir = join(rootDir, 'apps/jobs-cron')
	patchWranglerApp('jobs-cron', deployEnv)
	wranglerDeploy(appDir, 'wrangler.deploy.jsonc', deployEnv)
}

function deployTenantApi(deployEnv) {
	const appDir = join(rootDir, 'apps/tenant-api')
	patchWranglerApp('tenant-api', deployEnv)
	runLaunchCommand('npm run generate:do-migrations', appDir)
	wranglerDeploy(appDir, 'wrangler.deploy.jsonc', deployEnv)
}

function deployWeb(deployEnv, { build = true } = {}) {
	if (build) {
		try {
			runLaunchCommand(
				'npm rebuild sharp libsql rolldown @astrojs/compiler-binding',
				rootDir,
			)
		} catch {
			log('  (skipped optional native rebuild for web)', 'gray')
		}
		runLaunchCommand('npx turbo run build --filter=web', rootDir, {
			CLOUDFLARE_BUILD: 'true',
		})
	}
	patchWranglerApp('web', deployEnv)
	astroWranglerDeploy('web', deployEnv)
}

function deploySites(urls, deployEnv, { build = true } = {}) {
	if (build) {
		runLaunchCommand('npx turbo run build --filter=sites', rootDir, {
			PUBLIC_APP_URL: urls.public_app_url,
			TENANT_API_URL: urls.tenant_api_url,
			TENANT_API_URL_KSA: urls.tenant_api_url_ksa,
		})
	}
	patchWranglerApp('sites', deployEnv)
	astroWranglerDeploy('sites', deployEnv)
}

async function deployCloudflareWorkers(urls, deployEnv, { skipBuilds = false } = {}) {
	const label = deployEnv === 'staging' ? 'staging' : 'production'
	log(`\n🚀 Building and deploying Cloudflare Workers (${label})…`, 'yellow')

	const steps = [
		{
			name: 'App',
			run: () =>
				deployReactRouterApp('app', deployEnv, { build: !skipBuilds }),
		},
		{
			name: 'Admin',
			run: () =>
				deployReactRouterApp('admin', deployEnv, { build: !skipBuilds }),
		},
		{
			name: 'Jobs Cron',
			run: () => deployJobsCron(deployEnv),
		},
		{
			name: 'Tenant API US',
			optional: true,
			run: () => deployTenantApi(deployEnv),
		},
		{
			name: 'Web',
			run: () => deployWeb(deployEnv, { build: !skipBuilds }),
		},
		{
			name: 'Sites',
			run: () => deploySites(urls, deployEnv, { build: !skipBuilds }),
		},
	]

	const failures = []
	for (const step of steps) {
		log(`\n▶ ${step.name}`, 'blue')
		try {
			step.run()
			log(`✅ ${step.name} deployed`, 'green')
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			if (step.optional) {
				log(`⚠️  ${step.name} skipped: ${message}`, 'yellow')
			} else {
				failures.push(`${step.name}: ${message}`)
				log(`❌ ${step.name} failed: ${message}`, 'yellow')
			}
		}
	}

	if (failures.length > 0) {
		throw new Error(failures.join('; '))
	}

	log(`\n✅ ${label} deploy complete`, 'green')
}

function getGhVariables(config) {
	const prod = config.bindings.production
	const staging = config.bindings.staging
	const urls = config.urls

	return [
		['APP_D1_DATABASE_ID', prod.app.d1_database_id],
		['APP_KV_NAMESPACE_ID', prod.app.kv_namespace_id],
		['APP_WORKER_NAME', prod.app.worker_name],
		['ADMIN_D1_DATABASE_ID', prod.admin.d1_database_id],
		['ADMIN_KV_NAMESPACE_ID', prod.admin.kv_namespace_id],
		['ADMIN_WORKER_NAME', prod.admin.worker_name],
		['WEB_D1_DATABASE_ID', prod.web.d1_database_id],
		['WEB_R2_BUCKET_NAME', prod.web.r2_bucket_name],
		['WEB_WORKER_NAME', prod.web.worker_name],
		['SITES_WORKER_NAME', prod.sites.worker_name],
		['JOBS_CRON_WORKER_NAME', prod.jobs_cron.worker_name],
		['TENANT_API_US_WORKER_NAME', prod.tenant_api.worker_name],
		['APP_BASE_URL', urls.app_base_url],
		['ADMIN_BASE_URL', urls.admin_base_url],
		['WEB_BASE_URL', urls.web_base_url],
		['PUBLIC_APP_URL', urls.public_app_url],
		['ROOT_APP', urls.root_app],
		['ROOT_APP_STAGING', urls.root_app_staging],
		['PUBLIC_SITE_HOST_SUFFIXES', urls.public_site_host_suffixes],
		['PUBLIC_SITE_HOST_SUFFIXES_STAGING', urls.public_site_host_suffixes_staging],
		['PUBLIC_APP_URL_STAGING', urls.public_app_url_staging],
		['TENANT_API_URL', urls.tenant_api_url],
		['TENANT_API_URL_KSA', urls.tenant_api_url_ksa],
		['JOBS_CRON_WORKER_URL', urls.jobs_cron_worker_url],
		['APP_BASE_URL_STAGING', urls.app_base_url_staging],
		['ADMIN_BASE_URL_STAGING', urls.admin_base_url_staging],
		['WEB_BASE_URL_STAGING', urls.web_base_url_staging],
		['TENANT_API_URL_STAGING', urls.tenant_api_url_staging],
		['JOBS_CRON_WORKER_URL_STAGING', urls.jobs_cron_worker_url_staging],
		['APP_D1_DATABASE_ID_STAGING', staging.app.d1_database_id],
		['APP_KV_NAMESPACE_ID_STAGING', staging.app.kv_namespace_id],
		['APP_WORKER_NAME_STAGING', staging.app.worker_name],
		['ADMIN_D1_DATABASE_ID_STAGING', staging.admin.d1_database_id],
		['ADMIN_KV_NAMESPACE_ID_STAGING', staging.admin.kv_namespace_id],
		['ADMIN_WORKER_NAME_STAGING', staging.admin.worker_name],
		['WEB_D1_DATABASE_ID_STAGING', staging.web.d1_database_id],
		['WEB_R2_BUCKET_NAME_STAGING', staging.web.r2_bucket_name],
		['WEB_WORKER_NAME_STAGING', staging.web.worker_name],
		['SITES_WORKER_NAME_STAGING', staging.sites.worker_name],
		['JOBS_CRON_WORKER_NAME_STAGING', staging.jobs_cron.worker_name],
		['TENANT_API_US_WORKER_NAME_STAGING', staging.tenant_api.worker_name],
	]
}

function printGhCommands(config) {
	const variables = getGhVariables(config)

	log(
		'\n📦 GitHub repository Variables (Settings → Secrets and variables → Actions → Variables)',
		'bright',
	)
	for (const [name, value] of variables) {
		if (!value) continue
		console.log(`gh variable set ${name} --body "${value}"`)
	}

	log('\n🔐 GitHub repository Secrets (set manually — do not commit values)', 'bright')
	console.log('gh secret set CLOUDFLARE_API_TOKEN')
	console.log('gh secret set CLOUDFLARE_ACCOUNT_ID')
	console.log('# Optional OCI deploy: gh secret set OCI_TENANT_SSH_KEY')
	console.log('# Optional private GHCR pulls: gh secret set GHCR_PULL_TOKEN')
}

function printWranglerSecrets(secrets) {
	log('\n🔑 Wrangler secrets (run once per Worker; values never go in git)', 'bright')
	log('Generated values are in launch.secrets.json — paste when wrangler prompts.\n', 'gray')

	const blocks = [
		{
			title: 'App (apps/app)',
			keys: [
				['SESSION_SECRET', secrets.shared.SESSION_SECRET],
				['HONEYPOT_SECRET', secrets.shared.HONEYPOT_SECRET],
				['INTERNAL_COMMAND_TOKEN', secrets.shared.INTERNAL_COMMAND_TOKEN],
				['TENANT_OPERATOR_TOKEN', secrets.shared.TENANT_OPERATOR_TOKEN],
				['JWT_SECRET', secrets.app.JWT_SECRET],
				['TENANT_CUSTOMER_JWT_SECRET', secrets.app.TENANT_CUSTOMER_JWT_SECRET],
				['SSO_ENCRYPTION_KEY', secrets.shared.SSO_ENCRYPTION_KEY],
				['AUDIT_LOG_SECRET_KEY', secrets.shared.AUDIT_LOG_SECRET_KEY],
				['LAUNCH_STATUS', 'CLOSED_BETA | PUBLIC_BETA | LAUNCHED'],
				['BASE_URL', '(your APP_BASE_URL)'],
				['RESEND_API_KEY', '(from Resend dashboard)'],
				['AWS_SECRET_ACCESS_KEY', '(R2 API token)'],
			],
		},
		{
			title: 'Admin (apps/admin)',
			keys: [
				['SESSION_SECRET', secrets.shared.SESSION_SECRET],
				['HONEYPOT_SECRET', secrets.shared.HONEYPOT_SECRET],
				['INTERNAL_COMMAND_TOKEN', secrets.shared.INTERNAL_COMMAND_TOKEN],
				['SSO_ENCRYPTION_KEY', secrets.shared.SSO_ENCRYPTION_KEY],
				['AUDIT_LOG_SECRET_KEY', secrets.shared.AUDIT_LOG_SECRET_KEY],
				['LAUNCH_STATUS', '(same as App)'],
				['BASE_URL', '(your ADMIN_BASE_URL)'],
			],
		},
		{
			title: 'Tenant API US (apps/tenant-api)',
			keys: [
				['JWT_SECRET', secrets.tenant_api.JWT_SECRET],
				['AUTH_HMAC_SECRET', secrets.tenant_api.AUTH_HMAC_SECRET],
				['INTERNAL_COMMAND_TOKEN', secrets.shared.INTERNAL_COMMAND_TOKEN],
				['TENANT_OPERATOR_TOKEN', secrets.shared.TENANT_OPERATOR_TOKEN],
			],
		},
		{
			title: 'Jobs Cron (apps/jobs-cron)',
			keys: [['INTERNAL_COMMAND_TOKEN', secrets.shared.INTERNAL_COMMAND_TOKEN]],
		},
	]

	for (const block of blocks) {
		log(`\n${block.title}`, 'blue')
		for (const [name, hint] of block.keys) {
			console.log(`  npx wrangler secret put ${name}`)
			if (hint && !hint.startsWith('(')) {
				log(`    → ${hint}`, 'gray')
			}
		}
		log('  # Repeat with --env staging for the dev branch Worker', 'gray')
	}
}

async function setupDeploymentPages(defaultRepoUrl = '') {
	const openPages = await confirm({
		message:
			'Open Cloudflare API tokens + GitHub Actions secrets pages in your browser?',
		default: true,
	})
	if (!openPages) return

	openUrl('https://dash.cloudflare.com/profile/api-tokens')

	const repoUrl = await input({
		message: 'GitHub repo URL (for secrets page; leave blank to skip)',
		default: defaultRepoUrl,
	})
	if (repoUrl) {
		const normalized = repoUrl.replace(/\/$/, '')
		openUrl(`${normalized}/settings/secrets/actions`)
		openUrl(`${normalized}/settings/variables/actions`)
	} else {
		log('Set secrets at: GitHub repo → Settings → Secrets and variables → Actions', 'gray')
	}
}

async function main() {
	log('\n🚀 Epic Startup — Launch Setup', 'bright')
	log('Creates launch.config.json + launch.secrets.json and prints CI/CD steps.\n', 'gray')

	const runMonorepoSetup = await confirm({
		message: 'Run monorepo setup first (db, brand, SSL, hosts)?',
		default: !existsSync(join(rootDir, 'packages/database/data.db')),
	})
	if (runMonorepoSetup) {
		log('\nRunning npm run setup…', 'yellow')
		execSync('npm run setup', { cwd: rootDir, stdio: 'inherit' })
	}

	log('\nDetecting Cloudflare account + existing resources…', 'gray')
	const inferred = await inferLaunchConfig(rootDir)
	printInferredSummary(inferred, log)

	const apex = await input({
		message: 'Platform apex domain (e.g. epic-startup.me)',
		default: inferred.urls.apex ?? '',
		validate: (value) => (value.trim() ? true : 'Domain is required'),
	})

	const hasExistingD1 = Boolean(inferred.bindings.production.app.d1_database_id)
	const uniqueSuffix = await confirm({
		message:
			'Append a random suffix to Worker names? (useful when multiple installs share one Cloudflare account)',
		default: false,
	})
	const suffix = uniqueSuffix ? `-${randomHex(2)}` : ''
	const createResources = await confirm({
		message: hasExistingD1
			? 'Create missing Cloudflare D1/KV/R2 resources? (existing resources were detected)'
			: 'Create Cloudflare D1/KV/R2 resources now? (requires wrangler login)',
		default: !hasExistingD1 && inferred.wranglerLoggedIn,
	})
	const applyGh = ghAvailable()
		? await confirm({
				message: 'Apply GitHub Variables with gh CLI now?',
				default: false,
			})
		: false

	const appUrl = `https://app.${apex}`
	const adminUrl = `https://admin.${apex}`
	const webUrl = `https://${apex}`
	const tenantUs = `https://tenant-us.${apex}`
	const tenantKsa = `https://tenant-ksa.${apex}`
	const publicAppUrl = appUrl
	const jobsCronUrl = `https://jobs.${apex}`

	const secrets = generateSharedSecrets()
	const secretsPath = join(rootDir, 'launch.secrets.json')
	writeFileSync(secretsPath, `${JSON.stringify(secrets, null, '\t')}\n`)
	log(`\n✅ Wrote ${secretsPath} (gitignored)`, 'green')

	const envPatches = {
		SESSION_SECRET: secrets.shared.SESSION_SECRET,
		HONEYPOT_SECRET: secrets.shared.HONEYPOT_SECRET,
		INTERNAL_COMMAND_TOKEN: secrets.shared.INTERNAL_COMMAND_TOKEN,
		TENANT_OPERATOR_TOKEN: secrets.shared.TENANT_OPERATOR_TOKEN,
		JWT_SECRET: secrets.app.JWT_SECRET,
		TENANT_CUSTOMER_JWT_SECRET: secrets.app.TENANT_CUSTOMER_JWT_SECRET,
		JOBS_CRON_WORKER_URL: jobsCronUrl,
		ROOT_APP: apex,
		BASE_URL: appUrl,
		TENANT_API_URL: tenantUs,
		TENANT_API_URL_KSA: tenantKsa,
	}
	const appEnvPatched = patchEnvFile(join(rootDir, 'apps/app/.env'), envPatches)
	const adminEnvPatched = patchEnvFile(join(rootDir, 'apps/admin/.env'), {
		SESSION_SECRET: secrets.shared.SESSION_SECRET,
		HONEYPOT_SECRET: secrets.shared.HONEYPOT_SECRET,
		INTERNAL_COMMAND_TOKEN: secrets.shared.INTERNAL_COMMAND_TOKEN,
		ROOT_APP: apex,
		BASE_URL: adminUrl,
	})
	const sitesEnvPatched = patchEnvFile(join(rootDir, 'apps/sites/.env'), {
		ROOT_APP: apex,
		PUBLIC_APP_URL: publicAppUrl,
		TENANT_API_URL: tenantUs,
		TENANT_API_URL_KSA: tenantKsa,
	})
	if (appEnvPatched || adminEnvPatched || sitesEnvPatched) {
		log('Updated local .env files with generated secrets and platform URLs.', 'green')
	}

	/** @type {Record<string, unknown>} */
	const config = JSON.parse(
		readFileSync(join(rootDir, 'launch.config.example.json'), 'utf8'),
	)

	config.urls = {
		app_base_url: appUrl,
		admin_base_url: adminUrl,
		web_base_url: webUrl,
		public_app_url: publicAppUrl,
		root_app: apex,
		public_site_host_suffixes: `${apex},workers.dev`,
		tenant_api_url: tenantUs,
		tenant_api_url_ksa: tenantKsa,
		jobs_cron_worker_url: jobsCronUrl,
		...stagingHostnames(apex),
	}
	log(`\nJobs cron URL: ${jobsCronUrl}`, 'gray')
	log(
		'  Attach jobs.<apex> as a custom domain on the jobs-cron Worker in Cloudflare.',
		'gray',
	)

	const defaultWorkerNames = {
		production: {
			app: `epic-startup-app${suffix}`,
			admin: `epic-startup-admin${suffix}`,
			web: `epic-startup${suffix}`,
			sites: `epic-startup-sites${suffix}`,
			jobs_cron: `epic-startup-jobs-cron${suffix}`,
			tenant_api: `epic-startup-tenant-api-us${suffix}`,
		},
		staging: {
			app: `epic-startup-app-staging${suffix}`,
			admin: `epic-startup-admin-staging${suffix}`,
			web: `epic-startup-staging${suffix}`,
			sites: `epic-startup-sites-staging${suffix}`,
			jobs_cron: `epic-startup-jobs-cron-staging${suffix}`,
			tenant_api: `epic-startup-tenant-api-us-staging${suffix}`,
		},
	}

	for (const env of ['production', 'staging']) {
		for (const [app, fallbackName] of Object.entries(defaultWorkerNames[env])) {
			config.bindings[env][app].worker_name =
				inferred.bindings[env]?.[app]?.worker_name ?? fallbackName
		}
	}

	mergeInferredBindings(config, inferred)

	if (createResources) {
		log('\nCreating Cloudflare resources…', 'yellow')
		try {
			const appD1 = runWrangler(
				['d1', 'create', CF_D1.app],
				join(rootDir, 'apps/app'),
			)
			config.bindings.production.app.d1_database_id = parseD1CreateOutput(appD1)
			config.bindings.production.admin.d1_database_id =
				config.bindings.production.app.d1_database_id

			const appKv = runWrangler(
				['kv', 'namespace', 'create', CF_KV.app],
				join(rootDir, 'apps/app'),
			)
			config.bindings.production.app.kv_namespace_id = parseKvCreateOutput(appKv)
			config.bindings.production.admin.kv_namespace_id =
				config.bindings.production.app.kv_namespace_id

			const stagingD1 = runWrangler(
				['d1', 'create', CF_D1.appStaging],
				join(rootDir, 'apps/app'),
			)
			config.bindings.staging.app.d1_database_id = parseD1CreateOutput(stagingD1)
			config.bindings.staging.admin.d1_database_id =
				config.bindings.staging.app.d1_database_id

			const stagingKv = runWrangler(
				['kv', 'namespace', 'create', CF_KV.appStaging],
				join(rootDir, 'apps/app'),
			)
			config.bindings.staging.app.kv_namespace_id = parseKvCreateOutput(stagingKv)
			config.bindings.staging.admin.kv_namespace_id =
				config.bindings.staging.app.kv_namespace_id

			const webD1 = runWrangler(
				['d1', 'create', CF_D1.web],
				join(rootDir, 'apps/web'),
			)
			config.bindings.production.web.d1_database_id = parseD1CreateOutput(webD1)

			runWrangler(
				['r2', 'bucket', 'create', config.bindings.production.web.r2_bucket_name],
				join(rootDir, 'apps/web'),
			)

			const webD1Staging = runWrangler(
				['d1', 'create', CF_D1.webStaging],
				join(rootDir, 'apps/web'),
			)
			config.bindings.staging.web.d1_database_id = parseD1CreateOutput(webD1Staging)
			runWrangler(
				['r2', 'bucket', 'create', config.bindings.staging.web.r2_bucket_name],
				join(rootDir, 'apps/web'),
			)

			log('Cloudflare resources created.', 'green')
		} catch (error) {
			log(`\nResource creation failed: ${error.message}`, 'yellow')
			log(
				'You can create resources manually and re-run, or edit launch.config.json.',
				'gray',
			)
		}
	} else {
		log(
			'\nSkipped resource creation. Edit launch.config.json with your D1/KV/R2 IDs.',
			'gray',
		)
	}

	// Re-infer after create (or skip) so D1/KV IDs land in launch.config even if
	// wrangler create output parsing failed or resources already existed.
	const refreshed = await inferLaunchConfig(rootDir)
	mergeInferredBindings(config, refreshed)

	const outputPath = join(rootDir, 'launch.config.json')
	writeFileSync(outputPath, `${JSON.stringify(config, null, '\t')}\n`)
	log(`\n✅ Wrote ${outputPath}`, 'green')

	const hasD1 = Boolean(
		config.bindings.production.app.d1_database_id ||
			config.bindings.staging.app.d1_database_id,
	)
	const applyMigrations =
		hasD1 && inferred.wranglerLoggedIn
			? await confirm({
					message:
						'Apply control-plane D1 migrations to Cloudflare (App + Admin; production + staging)?',
					default: true,
				})
			: false
	if (applyMigrations) {
		applyRemoteD1Migrations(config)
	}

	printGhCommands(config)

	if (applyGh) {
		log('\nApplying GitHub Variables…', 'yellow')
		for (const [name, value] of getGhVariables(config)) {
			if (!value) continue
			try {
				execSync(`gh variable set ${name} --body "${value}"`, {
					cwd: rootDir,
					stdio: 'inherit',
				})
			} catch {
				log(`Failed to set ${name}`, 'yellow')
			}
		}
	}

	const deployWorkers =
		inferred.wranglerLoggedIn
			? await confirm({
					message:
						'Build and deploy all Cloudflare Workers to production now? (app, admin, jobs-cron, tenant-api, web, sites)',
					default: true,
				})
			: false
	if (deployWorkers) {
		try {
			await deployCloudflareWorkers(config.urls, 'production')
		} catch (error) {
			log(`\nProduction deploy had errors: ${error.message}`, 'yellow')
			log('You can retry individual apps — see docs/launch-checklist.md', 'gray')
		}
	}

	const deployStaging =
		inferred.wranglerLoggedIn && deployWorkers
			? await confirm({
					message: 'Also deploy staging Workers? (reuses builds where possible)',
					default: false,
				})
			: false
	if (deployStaging) {
		try {
			await deployCloudflareWorkers(config.urls, 'staging', { skipBuilds: true })
		} catch (error) {
			log(`\nStaging deploy had errors: ${error.message}`, 'yellow')
		}
	}

	printWranglerSecrets(secrets)
	await setupDeploymentPages(inferred.githubRepoUrl ?? '')

	log('\nNext steps:', 'bright')
	if (inferred.accountId) {
		log(
			`• Cloudflare account ID (for GitHub secret): ${inferred.accountId}`,
			'gray',
		)
	}
	log('1. Set GitHub Secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID', 'gray')
	log('2. Run wrangler secret put for each Worker (values in launch.secrets.json)', 'gray')
	if (!deployWorkers) {
		log(
			'3. Build + deploy: npm run deploy:cf in apps/app and apps/admin; see docs/launch-checklist.md',
			'gray',
		)
	}
	log('4. Push to main/dev — CI patches wrangler configs from GitHub Variables', 'gray')
	log('5. Follow docs/launch-checklist.md for LAUNCH_STATUS and product phases', 'gray')
	log(
		`6. Route jobs.${apex} to the jobs-cron Worker (custom domain in Cloudflare)`,
		'gray',
	)
}

main().catch((error) => {
	console.error(error)
	process.exit(1)
})
