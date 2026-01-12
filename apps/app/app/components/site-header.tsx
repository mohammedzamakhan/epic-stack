import { Trans } from '@lingui/macro'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { Kbd } from '@repo/ui/kbd'
import { SidebarTrigger } from '@repo/ui/sidebar'
import { useState } from 'react'
import { useFetcher } from 'react-router'
import { useGlobalHotkeys } from '#app/hooks/use-hotkeys.ts'
import { CommandMenu } from './command-menu'
import NotificationBell from './ui/notification-bell'

export function SiteHeader({ isCollapsed }: { isCollapsed: boolean }) {
	const [commandOpen, setCommandOpen] = useState(false)
	const sidebar = useFetcher()
	// Setup global hotkeys
	useGlobalHotkeys(setCommandOpen)

	return (
		<>
			<header className="flex h-(--header-height) w-full shrink-0 items-center justify-between border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
				<div className="flex items-center px-4">
					<SidebarTrigger
						onClick={() => {
							const formData = new FormData()
							formData.append('isCollapsed', isCollapsed ? 'false' : 'true')
							void sidebar.submit(formData, {
								method: 'POST',
								action: '/resources/sidebar-state',
							})
						}}
						className="-ml-1"
						type="submit"
					/>
				</div>
				<div className="flex flex-1 gap-4 px-2 pr-6 md:flex-none">
					<Button
						variant="outline"
						className="bg-muted/50 text-muted-foreground relative h-8 w-[calc(100%-1rem)] flex-1 flex-row-reverse justify-start rounded-[0.5rem] text-sm font-normal shadow-none md:w-40 lg:w-64 ltr:text-left ltr:sm:pr-12 rtl:text-right rtl:sm:pl-12"
						onClick={() => setCommandOpen(true)}
						aria-haspopup="dialog"
						aria-expanded={commandOpen}
					>
						<span className="min-w-0 flex-1 truncate">
							<Trans>Search notes...</Trans>
						</span>
						<Icon name="search" className="mr-2 h-4 w-4 flex-shrink-0" />
						<Kbd className="absolute top-[0.3rem] ltr:right-[0.3rem] rtl:left-[0.3rem]">
							<span className="text-xs">⌘</span>K
						</Kbd>
					</Button>
					<NotificationBell />
				</div>
			</header>
			<CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
		</>
	)
}
