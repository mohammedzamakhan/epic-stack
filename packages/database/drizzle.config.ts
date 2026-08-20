import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'drizzle-kit'

const packageDir = path.dirname(fileURLToPath(import.meta.url))

function sqliteUrl() {
	const raw = process.env.DATABASE_URL?.replace(/\?.*$/, '')
	if (!raw) return `file:${path.join(packageDir, 'db/data.db')}`
	const filePath = raw.replace(/^file:/, '')
	if (path.isAbsolute(filePath)) return `file:${filePath}`
	return `file:${path.resolve(packageDir, filePath)}`
}

/**
 * Drizzle Kit config for the US control-plane SQLite database.
 * Paths are absolute so `drizzle-kit` works when launched from apps/studio.
 */
export default defineConfig({
	schema: path.join(packageDir, 'src/schema.ts'),
	out: path.join(packageDir, 'drizzle'),
	dialect: 'sqlite',
	dbCredentials: {
		url: sqliteUrl(),
	},
})
