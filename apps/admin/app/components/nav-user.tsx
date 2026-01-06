import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@repo/ui/sidebar'
import { useRef } from 'react'
import { useFetcher } from 'react-router'

import { useOptimisticThemeMode } from '#app/routes/resources+/theme-switch.tsx'
import { useOptionalRequestInfo } from '#app/utils/request-info.ts'
import { SunMoonIcon } from './icons/sun-moon-icon'

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

	const getInitials = (name: string) => {
		const parts = name
			.trim()
			.split(/\s+/)
			.filter((part) => part.length > 0)
		if (parts.length >= 2) {
			return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
		}
		return name.slice(0, 2).toUpperCase()
	}

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
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								render={
									<button>
										<Avatar className="h-8 w-8">
											<AvatarImage src={user.avatar} alt={user.name} />
											<AvatarFallback>{getInitials(user.name)}</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">{user.name}</span>
											<span className="text-muted-foreground truncate text-xs">
												{user.email}
											</span>
										</div>
										<Icon name="ellipsis-vertical" className="ml-auto size-4" />
									</button>
								}
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-full"
							></SidebarMenuButton>
						}
					></DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-40 rounded-lg"
						side={isMobile ? 'bottom' : 'top'}
						align="start"
						sideOffset={4}
						style={{ width: 'var(--anchor-width)' }}
					>
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
										onClick={(e) => {
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
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
