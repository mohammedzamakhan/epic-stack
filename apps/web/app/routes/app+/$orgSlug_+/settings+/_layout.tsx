import { Outlet, useLocation, useRouteLoaderData } from 'react-router'
import { Link } from 'react-router'
import { PageTitle } from '#app/components/ui/page-title.tsx'
import { cn } from '#app/utils/misc'
import { type loader as rootLoader } from '#app/root.tsx'

export default function SettingsLayout() {
	const rootData = useRouteLoaderData<typeof rootLoader>('root')
	const location = useLocation()
	const orgSlug =
		rootData?.userOrganizations?.currentOrganization?.organization.slug

	return (
		<div className="p-8">
			<div className="mb-8">
				<PageTitle
					title="Settings"
					description="Manage your organization settings and preferences."
				/>
			</div>

			<div className="flex gap-8">
				<div className="min-w-0 flex-1">
					<Outlet />
				</div>
			</div>
		</div>
	)
}
