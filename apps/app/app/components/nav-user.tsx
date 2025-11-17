import { useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui'
import { Link, Form, useFetcher } from 'react-router'
import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'

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
import { useOptimisticThemeMode } from '#app/routes/resources+/theme-switch.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
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

	// Generate admin URL by replacing app. with admin.
	const getAdminUrl = () => {
		if (typeof window === 'undefined') return ''

		const { protocol, hostname, port } = window.location
		const adminHostname = hostname.startsWith('app.')
			? hostname.replace('app.', 'admin.')
			: `admin.${hostname}`

		return `${protocol}//${adminHostname}${port ? `:${port}` : ''}`
	}

	// Theme switching logic
	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? userPreference ?? 'system'

	const { _ } = useLingui()

	const themeOptions = [
		{ value: 'light', icon: 'sun', label: _(msg`Light mode`) },
		{ value: 'dark', icon: 'moon', label: _(msg`Dark mode`) },
		{ value: 'system', icon: 'laptop', label: _(msg`System theme`) },
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
							<div className="grid flex-1 text-sm leading-tight ltr:text-left rtl:text-right">
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
								<Link to="/profile">
									<UserIcon
										ref={(ref: any) => (iconRefs.current['account'] = ref)}
										size={16}
									/>
									<Trans>Account</Trans>
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem
								asChild
								className="gap-2"
								onMouseEnter={() => handleMenuItemMouseEnter('organizations')}
								onMouseLeave={() => handleMenuItemMouseLeave('organizations')}
							>
								<Link to="/organizations">
									<BuildingIcon
										ref={(ref: any) =>
											(iconRefs.current['organizations'] = ref)
										}
										size={16}
									/>
									<Trans>Organizations</Trans>
								</Link>
							</DropdownMenuItem>
							{isAdmin && (
								<DropdownMenuItem
									asChild
									className="gap-2"
									onMouseEnter={() => handleMenuItemMouseEnter('admin')}
									onMouseLeave={() => handleMenuItemMouseLeave('admin')}
								>
									<Link to={getAdminUrl()} target="_blank">
										<SettingsGearIcon
											ref={(ref: any) => (iconRefs.current['admin'] = ref)}
											size={16}
										/>
										<Trans>Super Admin</Trans>
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
								<Trans>Theme</Trans>
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
								<button type="submit" className="w-full ltr:text-left rtl:text-right">
									<Trans>Log out</Trans>
								</button>
							</Form>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
