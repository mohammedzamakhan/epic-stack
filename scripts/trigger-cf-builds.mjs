#!/usr/bin/env node
/**
 * Trigger Cloudflare Workers Builds after GHA CI passes.
 *
 * Prefers Builds API (CLOUDFLARE_BUILDS_API_TOKEN +
 * CF_BUILD_TRIGGER_*_<TIER>).
 *
 * Env:
 *   DEPLOY_TIER=production|staging
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN
 *   AFFECTED_* = true|false
 */

/** @type {Record<string, { triggerVar: string }>} */
const WORKERS = {
	app: { triggerVar: 'CF_BUILD_TRIGGER_APP' },
	admin: {
		triggerVar: 'CF_BUILD_TRIGGER_ADMIN',
	},
	web: { triggerVar: 'CF_BUILD_TRIGGER_WEB' },
	sites: {
		triggerVar: 'CF_BUILD_TRIGGER_SITES',
	},
	jobs_cron: {
		triggerVar: 'CF_BUILD_TRIGGER_JOBS_CRON',
	},
	tenant_api: {
		triggerVar: 'CF_BUILD_TRIGGER_TENANT_API',
	},
}

/** @type {{ affectedEnv: string, key: keyof typeof WORKERS }[]} */
const APPS = [
	{ affectedEnv: 'AFFECTED_APP', key: 'app' },
	{ affectedEnv: 'AFFECTED_ADMIN', key: 'admin' },
	{ affectedEnv: 'AFFECTED_WEB', key: 'web' },
	{ affectedEnv: 'AFFECTED_SITES', key: 'sites' },
	{ affectedEnv: 'AFFECTED_JOBS_CRON', key: 'jobs_cron' },
	{ affectedEnv: 'AFFECTED_TENANT_API', key: 'tenant_api' },
]

function branchForTier(tier) {
	return tier === 'staging' ? 'dev' : 'main'
}

function tierSuffix(tier) {
	return tier === 'staging' ? 'STAGING' : 'PRODUCTION'
}

async function triggerViaApi(workerKey, tier) {
	const meta = WORKERS[workerKey]
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
	const token =
		process.env.CLOUDFLARE_BUILDS_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN
	const triggerUuid = process.env[`${meta.triggerVar}_${tierSuffix(tier)}`]

	if (!accountId || !token || !triggerUuid) {
		return false
	}

	const response = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/builds/triggers/${triggerUuid}/builds`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				branch: branchForTier(tier),
				...(process.env.GITHUB_SHA
					? { commit_hash: process.env.GITHUB_SHA }
					: {}),
			}),
		},
	)

	const json = await response.json()
	if (!response.ok || !json.success) {
		const message =
			json.errors?.map((error) => error.message).join('; ') ||
			`HTTP ${response.status}`
		throw new Error(`${workerKey} Builds API failed: ${message}`)
	}

	console.log(
		`triggered ${workerKey} (${tier}) build ${json.result?.build_uuid ?? ''}`.trim(),
	)
	return true
}

async function triggerWorker(workerKey, tier) {
	if (await triggerViaApi(workerKey, tier)) return true
	throw new Error(
		`${workerKey} is affected but no deploy trigger is configured. Set ${WORKERS[workerKey].triggerVar}_${tierSuffix(tier)}.`,
	)
}

async function main() {
	const tier = process.env.DEPLOY_TIER === 'staging' ? 'staging' : 'production'
	let triggered = 0

	for (const { affectedEnv, key } of APPS) {
		if (process.env[affectedEnv] !== 'true') continue
		if (await triggerWorker(key, tier)) triggered++
	}

	if (triggered === 0) {
		console.log('no Cloudflare builds triggered')
	}
}

main().catch((error) => {
	console.error(error.message)
	process.exit(1)
})
