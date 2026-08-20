#!/usr/bin/env npx tsx
/**
 * One-time backfill of HMAC-SHA256 integrity hashes for existing audit logs.
 *
 * Usage:
 *   npx tsx scripts/audit-integrity-backfill.ts --dry-run
 *   npx tsx scripts/audit-integrity-backfill.ts --apply
 */

import { backfillIntegrityHashes } from '@repo/audit'

const dryRun = !process.argv.includes('--apply')
const batchSizeArg = process.argv.find((arg) => arg.startsWith('--batch-size='))
const batchSize = batchSizeArg
	? Number.parseInt(batchSizeArg.split('=')[1] ?? '100', 10)
	: 100

async function main() {
	console.log(
		`Starting audit integrity backfill (dryRun=${dryRun}, batchSize=${batchSize})`,
	)

	const result = await backfillIntegrityHashes({ dryRun, batchSize })

	console.log('Audit integrity backfill complete', result)
}

main().catch((error) => {
	console.error('Audit integrity backfill failed', error)
	process.exit(1)
})
