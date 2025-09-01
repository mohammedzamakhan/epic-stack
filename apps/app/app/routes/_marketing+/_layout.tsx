import { Outlet, useRouteLoaderData } from 'react-router'

import { Logo } from '#app/components/icons/logo.tsx'
import { EpicProgress } from '#app/components/progress-bar.tsx'
// useToast is not used in this file
import { HeroHeader } from '#app/components/ui/header.tsx'
import { type loader } from '#app/root.tsx'
import { ThemeSwitch } from '#app/routes/resources+/theme-switch.tsx'

export default function MarketingLayout() {
	const data = useRouteLoaderData<typeof loader>('root')

	return (
		<>
			<div className="flex min-h-screen flex-col justify-between">
				<HeroHeader />

				<div className="flex flex-1 flex-col">
					<Outlet />
				</div>

				<div className="container flex justify-between pb-5">
					<Logo />
					<ThemeSwitch userPreference={data?.requestInfo.userPrefs.theme} />
				</div>
			</div>
			<EpicProgress />
		</>
	)
}
