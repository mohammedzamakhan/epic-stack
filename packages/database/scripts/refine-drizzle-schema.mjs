import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = path.join(pkgRoot, 'db/data.db')
const sourcePath = path.join(pkgRoot, 'drizzle-introspect/schema.ts')
const relationsSource = path.join(pkgRoot, 'drizzle-introspect/relations.ts')
const outDir = path.join(pkgRoot, 'src')

const LEDGER = 'drizzle_migrations'
const LEGACY_LEDGER = Buffer.from(
	'X3ByaXNtYV9taWdyYXRpb25z',
	'base64',
).toString('utf8')

function sqlite(sql) {
	return execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8' }).trim()
}

const columnTypes = new Map()
for (const line of sqlite(
	`SELECT m.name || '|' || p.name || '|' || p.type || '|' || IFNULL(p.dflt_value,'')
	 FROM sqlite_master m JOIN pragma_table_info(m.name) p
	 WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'
	   AND m.name != '${LEDGER}' AND m.name != '${LEGACY_LEDGER}'
	 ORDER BY m.name, p.cid;`,
).split('\n')) {
	const [table, column, type, dflt] = line.split('|')
	columnTypes.set(`${table}.${column}`, { type: type.toUpperCase(), dflt })
}

const indexNames = {
	_PermissionToRole: '_PermissionToRole_B_index',
	_RoleToUser: '_RoleToUser_B_index',
	_OrganizationPermissionToRole: '_OrganizationPermissionToRole_B_index',
}

let schema = readFileSync(sourcePath, 'utf8')

schema = schema.replace(
	/import \{ sqliteTable, AnySQLiteColumn, text, numeric, integer, index, foreignKey, uniqueIndex, blob, real, primaryKey \} from "drizzle-orm\/sqlite-core"\n  import \{ sql \} from "drizzle-orm"/,
	`import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
import {
	blob,
	foreignKey,
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core'`,
)

schema = schema.replace(
	new RegExp(
		`export const ${LEDGER} = sqliteTable\\("${LEDGER}", \\{[\\s\\S]*?\\}\\);\\n\\n`,
	),
	'',
)
schema = schema.replace(
	new RegExp(
		`export const ${LEGACY_LEDGER} = sqliteTable\\("${LEGACY_LEDGER}", \\{[\\s\\S]*?\\}\\);\\n\\n`,
	),
	'',
)

let currentTable = null
schema = schema.replace(
	/export const (\w+) = sqliteTable\("([^"]+)"/g,
	(match, exportName, tableName) => {
		currentTable = tableName
		return match
	},
)

const lines = schema.split('\n')
currentTable = null
const refined = []

for (const line of lines) {
	const tableMatch = line.match(/sqliteTable\("([^"]+)"/)
	if (tableMatch) currentTable = tableMatch[1]

	if (currentTable && indexNames[currentTable]) {
		const unnamed = line.replace(
			/\tindex\(\)\.on\(table\.B\)/,
			`\tindex("${indexNames[currentTable]}").on(table.B)`,
		)
		if (unnamed !== line) {
			refined.push(unnamed)
			continue
		}
	}

	const colMatch = line.match(/^(\t)(\w+): (\w+)\((.*)\)(.*),$/)
	if (!colMatch || !currentTable) {
		refined.push(line)
		continue
	}

	const [, indent, colName, fn, args, rest] = colMatch
	const meta = columnTypes.get(`${currentTable}.${colName}`)
	if (!meta) {
		refined.push(line)
		continue
	}

	let chain = `${fn}(${args})${rest}`
	let builder

	if (meta.type === 'DATETIME') {
		builder = `integer({ mode: 'timestamp_ms' })`
		chain = chain.replace(/^numeric\(\)/, '')
		chain = chain.replace(/\.default\(sql`\(CURRENT_TIMESTAMP\)`\)/g, '')
		chain = chain.replace(/\.default\(sql`\(current_timestamp\)`\)/g, '')
		if (colName === 'createdAt' || colName === 'requestedAt' || colName === 'firstSeenAt' || colName === 'lastSeenAt') {
			chain = chain.replace(/\.notNull\(\)/, '') + ".$defaultFn(() => new Date()).notNull()"
			if (colName === 'lastSeenAt') {
				chain = chain.replace(/\.notNull\(\)$/, ".$onUpdate(() => new Date()).notNull()")
			}
		} else if (colName === 'updatedAt') {
			chain = chain.replace(/\.notNull\(\)/, '') + ".$defaultFn(() => new Date()).$onUpdate(() => new Date()).notNull()"
		}
		refined.push(`${indent}${colName}: ${builder}${chain},`)
		continue
	}

	if (meta.type === 'BOOLEAN') {
		builder = `integer({ mode: 'boolean' })`
		chain = chain.replace(/^numeric\(\)/, '')
		if (!chain.includes('.default(') && (meta.dflt === 'false' || meta.dflt === 'true')) {
			const boolDefault = meta.dflt === 'true'
			chain = `.default(${boolDefault})${chain}`
		}
		refined.push(`${indent}${colName}: ${builder}${chain},`)
		continue
	}

	if (meta.type === 'JSONB') {
		builder = `text({ mode: 'json' })`
		chain = chain.replace(/^numeric\(\)/, '').replace(/^text\(\)/, '')
		refined.push(`${indent}${colName}: ${builder}${chain},`)
		continue
	}

	if (meta.type === 'BLOB') {
		builder = `blob({ mode: 'buffer' })`
		chain = chain.replace(/^blob\(\)/, '')
		refined.push(`${indent}${colName}: ${builder}${chain},`)
		continue
	}

	if (colName === 'id' && fn === 'text' && currentTable !== 'Passkey') {
		const withDefault = rest.replace(
			'.primaryKey().notNull()',
			".primaryKey().$defaultFn(() => createId()).notNull()",
		)
		refined.push(`${indent}${colName}: text()${withDefault},`)
		continue
	}

	refined.push(line)
}

let output = refined.join('\n')
output = output.replaceAll('\tindex("', "\tindex('")
output = output.replaceAll('\tuniqueIndex("', "\tuniqueIndex('")
output = output.replaceAll('").on(', "').on(")
output = output.replaceAll('sqliteTable("', "sqliteTable('")
output = output.replaceAll('", {', "', {")
output = output.replaceAll('{ onDelete: "cascade", onUpdate: "cascade" }', "{ onDelete: 'cascade', onUpdate: 'cascade' }")
output = output.replaceAll('{ onDelete: "set null", onUpdate: "cascade" }', "{ onDelete: 'set null', onUpdate: 'cascade' }")
output = output.replaceAll('{ onDelete: "restrict", onUpdate: "cascade" }', "{ onDelete: 'restrict', onUpdate: 'cascade' }")
output = output.replaceAll('.onUpdate("cascade").onDelete("cascade")', ".onUpdate('cascade').onDelete('cascade')")
output = output.replaceAll('.onUpdate("cascade").onDelete("set null")', ".onUpdate('cascade').onDelete('set null')")
output = output.replaceAll('name: "UserOrganization_userId_organizationId_pk"', "name: 'UserOrganization_userId_organizationId_pk'")
output = output.replaceAll('name: "NoteComment_parentId_NoteComment_id_fk"', "name: 'NoteComment_parentId_NoteComment_id_fk'")
output = output.replaceAll('name: "User_bannedById_User_id_fk"', "name: 'User_bannedById_User_id_fk'")
output = output.replaceAll('.default("")', ".default('')")
output = output.replaceAll(".default('system')", '.default("system")')
output = output.replaceAll(' );', ' )')

// Keep string defaults in single quotes consistently after prettier
const header = `/**
 * Control-plane SQLite schema for Drizzle.
 *
 * Bootstrapped from the live SQLite file via \`drizzle-kit pull\`, then
 * refined so DATETIME columns use millisecond timestamps and BOOLEAN columns
 * use 0/1 integers — matching how this database already stores these values.
 *
 * Apply schema changes with drizzle-kit generate plus a SQL file in
 * migrations/ so scripts/migrate.mjs can deploy it. Do not drizzle-kit push
 * against a live control-plane database.
 */
`

mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'schema.ts'), header + output)

let relations = readFileSync(relationsSource, 'utf8')
relations = relations.replace(
	'import { relations } from "drizzle-orm/relations";',
	"import { relations } from 'drizzle-orm'",
)
relations = relations.replace('";', "'")
relations = relations.replace("from './schema'", "from './schema.ts'")
relations = relations.replaceAll('";', "'")
relations = relations.replaceAll('";\n', "'\n")
writeFileSync(path.join(outDir, 'relations.ts'), relations)

console.log('Wrote src/schema.ts and src/relations.ts')
