'use client'

import { Trans } from '@lingui/macro'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/avatar'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from '@repo/ui/dropdown-menu'
import { Icon } from '@repo/ui/icon'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@repo/ui/sidebar'
import * as React from 'react'
import { Link, useSubmit } from 'react-router'
import { useUserOrganizations } from '#app/utils/organizations.ts'

export function TeamSwitcher() {
	const submit = useSubmit()
	const { isMobile, toggleSidebar } = useSidebar()

	const userOrganizations = useUserOrganizations() || {
		organizations: [],
		currentOrganization: null,
	}

	const { organizations, currentOrganization } = userOrganizations

	const activeTeam = currentOrganization?.organization

	function handleOrganizationSelect(organizationId: string) {
		void submit(
			{ organizationId },
			{
				method: 'post',
				action: '/organizations/set-default',
			},
		)
	}

	if (!activeTeam) {
		return null
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="group bg-background relative h-14 border px-3 py-2 transition-all duration-200"
						>
							<div className="relative flex w-full items-center gap-3">
								{/* Enhanced Avatar Container */}
								<div className="relative">
									<div className="from-sidebar-primary/20 to-sidebar-primary/40 absolute inset-0 rounded bg-gradient-to-br" />
									<div className="from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground ring-sidebar-primary/20 relative flex size-8 items-center justify-center rounded bg-gradient-to-br ring-1">
										<Avatar className="size-8 rounded">
											{activeTeam.image?.objectKey ? (
												<AvatarImage
													src={`/resources/images?objectKey=${activeTeam.image.objectKey}`}
													alt={
														activeTeam.image?.altText ||
														`${activeTeam.name} logo`
													}
													className="object-cover ring ring-2"
												/>
											) : null}
											<AvatarFallback className="text-sidebar-primary-foreground bg-transparent text-sm font-semibold">
												{activeTeam.name.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									</div>
								</div>

								{/* Enhanced Text Content */}
								<div className="min-w-0 flex-1 ltr:text-left rtl:text-right">
									<div className="flex items-center gap-2">
										<span className="text-sidebar-foreground truncate text-sm font-semibold">
											{activeTeam.name}
										</span>
									</div>
									{activeTeam.userCount && (
										<span className="text-sidebar-foreground/60 text-xs">
											{activeTeam.userCount}{' '}
											{activeTeam.userCount === 1 ? (
												<Trans>member</Trans>
											) : (
												<Trans>members</Trans>
											)}
										</span>
									)}
								</div>

								{/* Enhanced Chevron */}
								<div className="bg-sidebar-accent/30 group-hover:bg-sidebar-accent/50 flex size-6 items-center justify-center rounded-md transition-colors">
									<Icon
										name="chevron-down"
										className="text-sidebar-foreground/70 size-3 transition-transform duration-200 group-data-[state=open]:rotate-180"
									/>
								</div>
							</div>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-40 rounded-lg"
						align="start"
						side="bottom"
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							<Trans>Organizations</Trans>
						</DropdownMenuLabel>
						{organizations.map((userOrg, index) => (
							<DropdownMenuItem
								key={userOrg.organization.id}
								onClick={() => {
									handleOrganizationSelect(userOrg.organization.id)
									if (isMobile) toggleSidebar()
								}}
								className="group/item gap-2 p-2"
							>
								<div className="relative">
									<div className="from-sidebar-primary/20 to-sidebar-primary/40 group-hover/item:from-sidebar-primary-foreground group-hover/item:to-sidebar-primary-foreground/80 absolute inset-0 rounded bg-gradient-to-br transition-colors" />
									<div className="from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground ring-sidebar-primary/20 group-hover/item:from-sidebar-primary-foreground group-hover/item:to-sidebar-primary-foreground/80 group-hover/item:text-sidebar-primary group-hover/item:ring-sidebar-primary relative flex size-6 items-center justify-center rounded bg-gradient-to-br ring-1 transition-colors">
										<Avatar className="size-6 rounded">
											{userOrg.organization.image?.objectKey ? (
												<AvatarImage
													src={`/resources/images?objectKey=${userOrg.organization.image.objectKey}`}
													alt={
														userOrg.organization.image?.altText ||
														`${userOrg.organization.name} logo`
													}
													className="object-cover"
												/>
											) : null}
											<AvatarFallback className="text-sidebar-primary-foreground group-hover/item:text-sidebar-primary bg-transparent text-xs font-semibold transition-colors">
												{userOrg.organization.name.slice(0, 2).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									</div>
								</div>
								{userOrg.organization.name}
								<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
							</DropdownMenuItem>
						))}
						<DropdownMenuItem
							asChild
							className="gap-2 p-2"
							onClick={() => isMobile && toggleSidebar()}
						>
							<Link to={`/${activeTeam.slug}/settings/members`}>
								<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
									<Icon name="user-plus" className="size-4" />
								</div>
								<div>
									<Trans>Invite members</Trans>
								</div>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild className="gap-2 p-2">
							<Link to="/organizations/create">
								<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
									<Icon name="plus" className="size-4" />
								</div>
								<div>
									<Trans>Add organization</Trans>
								</div>
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
