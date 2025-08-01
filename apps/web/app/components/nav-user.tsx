import * as React from 'react'
import { useRef } from 'react'
import { Link, Form } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from '#app/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu'
import { Icon } from '#app/components/ui/icon'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '#app/components/ui/sidebar'
import { UserIcon } from './icons/user-icon'
import { LogoutIcon } from './icons/logout-icon'

export function NavUser({
	user,
}: {
	user: {
		name: string
		email: string
		avatar: string
	}
}) {
	const { isMobile } = useSidebar()
	const iconRefs = useRef<{ [key: string]: any }>({})

	const handleMenuItemMouseEnter = (iconKey: string) => {
		const iconRef = iconRefs.current[iconKey]
		if (iconRef?.startAnimation) {
			iconRef.startAnimation()
		}
	}

	const handleMenuItemMouseLeave = (iconKey: string) => {
		const iconRef = iconRefs.current[iconKey]
		if (iconRef?.stopAnimation) {
			iconRef.stopAnimation()
		}
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8">
								<AvatarImage src={user.avatar} alt={user.name} />
								<AvatarFallback className="rounded-lg">CN</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="text-muted-foreground truncate text-xs">
									{user.email}
								</span>
							</div>
							<Icon name="ellipsis-vertical" className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-40 rounded-lg"
						side={isMobile ? 'bottom' : 'top'}
						align="start"
						sideOffset={4}
					>
						<DropdownMenuGroup>
							<DropdownMenuItem
								asChild
								className="gap-2"
								onMouseEnter={() => handleMenuItemMouseEnter('account')}
								onMouseLeave={() => handleMenuItemMouseLeave('account')}
							>
								<Link to="/settings/general">
									<UserIcon
										ref={(ref: any) => (iconRefs.current['account'] = ref)}
										size={16}
									/>
									Account
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							asChild
							className="gap-2"
							onMouseEnter={() => handleMenuItemMouseEnter('logout')}
							onMouseLeave={() => handleMenuItemMouseLeave('logout')}
						>
							<Form action="/logout" method="POST">
								<LogoutIcon
									ref={(ref: any) => (iconRefs.current['logout'] = ref)}
									size={16}
								/>
								<button type="submit" className="w-full text-left">
									Log out
								</button>
							</Form>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
