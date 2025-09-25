import { useState } from 'react'

import { useGlobalHotkeys } from '#app/hooks/use-hotkeys'
import { CommandMenu } from './command-menu'
import { Button, Separator, SidebarTrigger, Icon } from '@repo/ui'
import NotificationBell from './ui/notification-bell'
import { Form, useFetcher } from 'react-router'

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
						className="bg-muted/50 text-muted-foreground relative h-8 w-[calc(100%-1rem)] flex-1 justify-start rounded-[0.5rem] text-sm font-normal shadow-none sm:pr-12 md:w-40 lg:w-64"
						onClick={() => setCommandOpen(true)}
					>
						<Icon name="search" className="h-4 w-4" />
						Search notes...
						<kbd className="bg-muted pointer-events-none absolute top-[0.3rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
							<span className="text-xs">⌘</span>K
						</kbd>
					</Button>
					<NotificationBell />
				</div>
			</header>
			<CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
		</>
	)
}
