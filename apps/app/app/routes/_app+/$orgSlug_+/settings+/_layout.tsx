import { Outlet, useLocation, useRouteLoaderData } from 'react-router'
import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { type loader as rootLoader } from '#app/root.tsx'
import { PageTitle } from '@repo/ui/page-title'

export default function SettingsLayout() {
	const { _ } = useLingui()
	useRouteLoaderData<typeof rootLoader>('root')
	useLocation()

	return (
		<div className="py-8 md:p-8">
			<div className="mb-8">
				<PageTitle
					title={_(t`Settings`)}
					description={_(t`Manage your organization settings and preferences.`)}
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
