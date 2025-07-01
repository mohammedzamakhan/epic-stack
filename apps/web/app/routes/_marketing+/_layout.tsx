import {
    Link,
    Outlet,
    useMatches,
    useRouteLoaderData,
} from 'react-router'

import { EpicProgress } from '#app/components/progress-bar.tsx'
import { SearchBar } from '#app/components/search-bar.tsx'
// useToast is not used in this file
import { Button } from '#app/components/ui/button.tsx'
import { EpicToaster } from '#app/components/ui/sonner.tsx'
import { UserDropdown } from '#app/components/user-dropdown.tsx'
import { type loader } from '#app/root.tsx'
import {
    ThemeSwitch,
    useTheme,
} from '#app/routes/resources+/theme-switch.tsx'
import { useOptionalUser } from '#app/utils/user.ts'

function Logo() {
    return (
        <Link to="/" className="group grid leading-snug">
            <span className="font-light transition group-hover:-translate-x-1">
                epic
            </span>
            <span className="font-bold transition group-hover:translate-x-1">
                notes
            </span>
        </Link>
    )
}

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
				<header className="container py-6">
					<nav className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap md:gap-8">
						<Logo />
						<div className="ml-auto hidden max-w-sm flex-1 sm:block">
							{searchBar}
						</div>
						<div className="flex items-center gap-10">
							{user ? (
								<UserDropdown />
							) : (
								<Button asChild variant="default" size="lg">
									<Link to="/login">Log In</Link>
								</Button>
							)}
						</div>
						<div className="block w-full sm:hidden">{searchBar}</div>
					</nav>
				</header>

				<div className="flex flex-1 flex-col">
					<Outlet />
				</div>

				<div className="container flex justify-between pb-5">
					<Logo />
					<ThemeSwitch userPreference={data.requestInfo.userPrefs.theme} />
				</div>
			</div>
			<EpicToaster closeButton position="top-center" theme={theme} />
			<EpicProgress />
		</>
	)
}
