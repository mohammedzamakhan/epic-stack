import { useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui'
import { Link, Form, useFetcher } from 'react-router'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
	Icon,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@repo/ui'
import { useOptimisticThemeMode } from '#app/routes/resources+/theme-switch'
import { useOptionalRequestInfo } from '#app/utils/request-info'
import { BuildingIcon } from './icons/building-icon'
import { LogoutIcon } from './icons/logout-icon'
import { SettingsGearIcon } from './icons/settings-gear-icon'
import { SunMoonIcon } from './icons/sun-moon-icon'
import { UserIcon } from './icons/user-icon'

export function NavUser({
	user,
	userPreference,
}: {
	user: {
		name: string
		email: string
		avatar: string
		roles?: Array<{ name: string }> | undefined
	}
	userPreference?: 'light' | 'dark' | 'system' | null
}) {
	const { isMobile } = useSidebar()
	const iconRefs = useRef<{ [key: string]: any }>({})
	const themeFetcher = useFetcher()
	const requestInfo = useOptionalRequestInfo()

	// Check if user has admin role
	const isAdmin = user.roles?.some((role) => role.name === 'admin') ?? false

	// Theme switching logic
	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? userPreference ?? 'system'

	const themeOptions = [
		{ value: 'light', icon: 'sun', label: 'Light mode' },
		{ value: 'dark', icon: 'moon', label: 'Dark mode' },
		{ value: 'system', icon: 'laptop', label: 'System theme' },
	] as const

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
								<Link to="/app/profile">
									<UserIcon
										ref={(ref: any) => (iconRefs.current['account'] = ref)}
										size={16}
									/>
									Account
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem
								asChild
								className="gap-2"
								onMouseEnter={() => handleMenuItemMouseEnter('organizations')}
								onMouseLeave={() => handleMenuItemMouseLeave('organizations')}
							>
								<Link to="/app/organizations">
									<BuildingIcon
										ref={(ref: any) =>
											(iconRefs.current['organizations'] = ref)
										}
										size={16}
									/>
									Organizations
								</Link>
							</DropdownMenuItem>
							{isAdmin && (
								<DropdownMenuItem
									asChild
									className="gap-2"
									onMouseEnter={() => handleMenuItemMouseEnter('admin')}
									onMouseLeave={() => handleMenuItemMouseLeave('admin')}
								>
									<Link to="/admin">
										<SettingsGearIcon
											ref={(ref: any) => (iconRefs.current['admin'] = ref)}
											size={16}
										/>
										Super Admin
									</Link>
								</DropdownMenuItem>
							)}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuSub>
							<DropdownMenuSubTrigger
								className="gap-2"
								onMouseEnter={() => handleMenuItemMouseEnter('theme')}
								onMouseLeave={() => handleMenuItemMouseLeave('theme')}
							>
								<SunMoonIcon
									size={16}
									ref={(ref: any) => (iconRefs.current['theme'] = ref)}
								/>
								Theme
							</DropdownMenuSubTrigger>
							<DropdownMenuSubContent>
								{themeOptions.map((option) => (
									<DropdownMenuItem
										key={option.value}
										className="gap-2"
										onSelect={(e) => {
											e.preventDefault()
											const formData = new FormData()
											formData.append('theme', option.value)
											if (requestInfo?.path) {
												formData.append('redirectTo', requestInfo.path)
											}
											void themeFetcher.submit(formData, {
												method: 'POST',
												action: '/resources/theme-switch',
											})
										}}
									>
										<Icon name={option.icon as any} className="size-4" />
										<span
											className={mode === option.value ? 'font-medium' : ''}
										>
											{option.label}
										</span>
										{mode === option.value && (
											<Icon name="check" className="ml-auto size-4" />
										)}
									</DropdownMenuItem>
								))}
							</DropdownMenuSubContent>
						</DropdownMenuSub>
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
