import type { TenantDatabase } from './types.ts'

type TenantDbResolver = (
	orgId: string,
	options?: { createIfMissing?: boolean },
) => Promise<TenantDatabase>

type ListTenantOrgIdsProvider = () => string[] | Promise<string[]>

let tenantDbResolver: TenantDbResolver | null = null
let listTenantOrgIdsProvider: ListTenantOrgIdsProvider | null = null

export function setTenantDbResolver(resolver: TenantDbResolver | null) {
	tenantDbResolver = resolver
}

export function getTenantDbResolver() {
	return tenantDbResolver
}

export function setListTenantOrgIdsProvider(
	provider: ListTenantOrgIdsProvider | null,
) {
	listTenantOrgIdsProvider = provider
}

export async function resolveTenantDb(
	orgId: string,
	options: { createIfMissing?: boolean } = {},
	fallback: TenantDbResolver,
): Promise<TenantDatabase> {
	if (tenantDbResolver) {
		return tenantDbResolver(orgId, options)
	}
	return fallback(orgId, options)
}

export async function resolveTenantOrgIds(
	fallback: () => string[],
): Promise<string[]> {
	if (listTenantOrgIdsProvider) {
		return await listTenantOrgIdsProvider()
	}
	return fallback()
}
