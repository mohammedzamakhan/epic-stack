import { useEffect, useState } from 'react'
import { Button } from '#app/components/ui/button'
import { Separator } from '#app/components/ui/separator'
import { SidebarTrigger } from '#app/components/ui/sidebar'
import { loader as rootLoader } from '#app/root.tsx'
import { useRouteLoaderData } from 'react-router'
import { Icon } from './ui/icon'
import NotificationBell from './ui/notification-bell'
import { CommandMenu } from './command-menu'

export function SiteHeader() {
	const data = useRouteLoaderData<typeof rootLoader>('root')
	const [commandOpen, setCommandOpen] = useState(false)

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault()
				setCommandOpen((open) => !open)
			}
		}

		document.addEventListener('keydown', down)
		return () => document.removeEventListener('keydown', down)
	}, [])

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
				<div className="px-2 pr-6 flex gap-4">
					<Button
						variant="outline"
						className="relative h-8 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
						onClick={() => setCommandOpen(true)}
					>
						<Icon name="magnifying-glass" className="mr-2 h-4 w-4" />
						Search notes...
						<kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
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
