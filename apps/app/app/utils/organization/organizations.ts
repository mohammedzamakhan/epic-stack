import { useRouteLoaderData } from 'react-router'
import { type UserOrganizationWithRole } from './organizations.server'

export type UserOrganizations = {
	organizations: UserOrganizationWithRole[]
	currentOrganization: UserOrganizationWithRole | null
}

export function useOptionalUserOrganizations(): UserOrganizations | undefined {
	const data = useRouteLoaderData('root') as
		| {
				userOrganizations?: UserOrganizations
		  }
		| undefined
	return data?.userOrganizations
}

export function useUserOrganizations(): UserOrganizations {
	const data = useOptionalUserOrganizations()
	if (!data) throw new Error('User organizations not found in loader data')
	return data
}

export function useCurrentOrganization(): UserOrganizationWithRole {
	const { currentOrganization } = useUserOrganizations()
	if (!currentOrganization) throw new Error('Current organization not found')
	return currentOrganization
}
