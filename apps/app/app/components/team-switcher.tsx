'use client'

import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui'

import { Link, useSubmit } from 'react-router'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
	Icon,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@repo/ui'
import { useUserOrganizations } from '#app/utils/organizations'

export function TeamSwitcher() {
	const submit = useSubmit()

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
							className="group hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent/70 border-sidebar-border/50 from-sidebar-accent/20 to-sidebar-accent/10 relative h-14 rounded-xl border bg-gradient-to-r px-3 py-2 backdrop-blur-sm transition-all duration-200"
						>
							<div className="relative flex w-full items-center gap-3">
								{/* Enhanced Avatar Container */}
								<div className="relative">
									<div className="from-sidebar-primary/20 to-sidebar-primary/40 absolute inset-0 rounded bg-gradient-to-br blur-sm" />
									<div className="from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground ring-sidebar-primary/20 relative flex size-8 items-center justify-center rounded bg-gradient-to-br shadow-lg ring-1">
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
								<div className="min-w-0 flex-1 text-left">
									<div className="flex items-center gap-2">
										<span className="text-sidebar-foreground truncate text-sm font-semibold">
											{activeTeam.name}
										</span>
									</div>
									{activeTeam.userCount && (
										<span className="text-sidebar-foreground/60 text-xs">
											{activeTeam.userCount}{' '}
											{activeTeam.userCount === 1 ? 'member' : 'members'}
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
							Organizations
						</DropdownMenuLabel>
						{organizations.map((userOrg, index) => (
							<DropdownMenuItem
								key={userOrg.organization.id}
								onClick={() =>
									handleOrganizationSelect(userOrg.organization.id)
								}
								className="gap-2 p-2"
							>
								<div className="flex size-6 items-center justify-center rounded border">
									<Avatar className="size-6 rounded">
										{userOrg.organization.image?.objectKey ? (
											<AvatarImage
												src={`/resources/images?objectKey=${userOrg.organization.image.objectKey}`}
												alt={
													userOrg.organization.image?.altText ||
													`${userOrg.organization.name} logo`
												}
												className="grayscale-0"
											/>
										) : null}
										<AvatarFallback>
											{userOrg.organization.name
												.slice(0, 2)
												.toLocaleUpperCase()}
										</AvatarFallback>
									</Avatar>
								</div>
								{userOrg.organization.name}
								<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
							</DropdownMenuItem>
						))}
						<DropdownMenuItem asChild className="gap-2 p-2">
							<Link to={`/app/${activeTeam.slug}/settings/members`}>
								<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
									<Icon name="user-plus" className="size-4" />
								</div>
								<div>Invite members</div>
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild className="gap-2 p-2">
							<Link to="/organizations/create">
								<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
									<Icon name="plus" className="size-4" />
								</div>
								<div>Add organization</div>
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
