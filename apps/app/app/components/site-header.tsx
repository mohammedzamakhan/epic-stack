import { useState } from 'react'

import { useGlobalHotkeys } from '#app/hooks/use-hotkeys'
import { CommandMenu } from './command-menu'
import { Button, Separator, SidebarTrigger, Icon } from '@repo/ui'
import NotificationBell from './ui/notification-bell'

export function SiteHeader() {
	const [commandOpen, setCommandOpen] = useState(false)

	// Setup global hotkeys
	useGlobalHotkeys(setCommandOpen)

	return (
		<>
			<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
				<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mx-2 data-[orientation=vertical]:h-4"
					/>
				</div>
				<div className="flex gap-4 px-2 pr-6">
					<Button
						variant="outline"
						className="bg-muted/50 text-muted-foreground relative h-8 w-full justify-start rounded-[0.5rem] text-sm font-normal shadow-none sm:pr-12 md:w-40 lg:w-64"
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
