import { Button } from '#app/components/ui/button'
import { Separator } from '#app/components/ui/separator'
import { SidebarTrigger } from '#app/components/ui/sidebar'
import { Icon } from './ui/icon'

export function SiteHeader() {
	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 data-[orientation=vertical]:h-4"
				/>
				<div className="ml-auto flex items-center gap-2">
					<Button variant="ghost" size="sm" className="hidden sm:flex">
						<Icon name="bell" className="size-4" />
					</Button>
				</div>
			</div>
		</header>
	)
}
