import { Button } from '#app/components/ui/button'
import { Separator } from '#app/components/ui/separator'
import { SidebarTrigger } from '#app/components/ui/sidebar'
import { loader as rootLoader } from '#app/root.tsx'
import { useRouteLoaderData } from 'react-router'
import { Icon } from './ui/icon'
import { NotificationCenter } from '@repo/notifications'
import NotificationBell from './ui/notification-bell'

export function SiteHeader() {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 data-[orientation=vertical]:h-4"
				/>
			</div>
			<div className="px-2 pr-6">
				{/* <NotificationBell /> */}
			</div>
		</header>
	)
}
