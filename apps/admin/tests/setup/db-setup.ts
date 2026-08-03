import path from 'node:path'
import fsExtra from 'fs-extra'
import { afterAll, beforeAll } from 'vitest'
import { BASE_DATABASE_PATH } from './global-setup.ts'

const databaseFile = `./tests/prisma/data.${process.env.VITEST_POOL_ID || 0}.db`
const databasePath = path.join(process.cwd(), databaseFile)
process.env.DATABASE_URL = `file:${databasePath}`

beforeAll(async () => {
	await fsExtra.copyFile(BASE_DATABASE_PATH, databasePath)

	if (fsExtra.existsSync(`${BASE_DATABASE_PATH}-wal`)) {
		await fsExtra.copyFile(`${BASE_DATABASE_PATH}-wal`, `${databasePath}-wal`)
	} else {
		await fsExtra.remove(`${databasePath}-wal`).catch(() => {})
	}

	if (fsExtra.existsSync(`${BASE_DATABASE_PATH}-shm`)) {
		await fsExtra.copyFile(`${BASE_DATABASE_PATH}-shm`, `${databasePath}-shm`)
	} else {
		await fsExtra.remove(`${databasePath}-shm`).catch(() => {})
	}
})

afterAll(async () => {
	// we *must* use dynamic imports here so the process.env.DATABASE_URL is set
	// before prisma is imported and initialized
	const { prisma } = await import('@repo/database')
	if (prisma && typeof prisma.$disconnect === 'function') {
		await prisma.$disconnect()
	}
	await fsExtra.remove(databasePath)
})
