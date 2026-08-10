import { t } from '@lingui/macro'
import { useLingui } from '@lingui/react'
import { PageTitle } from '@repo/ui/page-title'
import { Outlet } from 'react-router'

export default function WebsiteLayout() {
	const { _ } = useLingui()

	return (
		<div className="mx-auto w-full max-w-4xl py-8 md:p-8">
			<div className="mb-8 md:mb-10">
				<PageTitle
					title={_(t`Website`)}
					description={_(
						t`Manage your public organization website and appearance.`,
					)}
				/>
			</div>
			<Outlet />
		</div>
	)
}
