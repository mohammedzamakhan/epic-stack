import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type * as schema from './schema.ts'

/** Tenant Drizzle handle (filesystem libsql in Node; DO SQLite on Workers). */
export type TenantDatabase = LibSQLDatabase<typeof schema>
