import { Link, Outlet, useMatches, useRouteLoaderData } from 'react-router'

import { EpicProgress } from '#app/components/progress-bar.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'
// useToast is not used in this file
import { Button } from '#app/components/ui/button.tsx'
import { EpicToaster } from '#app/components/ui/sonner.tsx'
import { UserDropdown } from '#app/components/user-dropdown.tsx'
import { type loader } from '#app/root.tsx'
import { ThemeSwitch, useTheme } from '#app/routes/resources+/theme-switch.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import { HeroHeader } from '#app/components/ui/header.tsx'
import { Logo } from '#app/components/icons/logo.tsx'

export default function MarketingLayout() {
	const data = useRouteLoaderData<typeof loader>('root')
	const user = useOptionalUser()
	const theme = useTheme()
	const matches = useMatches()
	const isOnSearchPage = matches.find((m) => m.id === 'routes/users+/index')
	const searchBar = isOnSearchPage ? null : <SearchBar status="idle" />

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
