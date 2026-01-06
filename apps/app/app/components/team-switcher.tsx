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
	DropdownMenuGroup,
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
					<DropdownMenuTrigger
						render={
							<SidebarMenuButton
								render={
									<button className="relative flex w-full items-center gap-3">
										{/* Enhanced Avatar Container */}
										<div className="relative">
											<div className="from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground ring-sidebar-primary/20 relative flex size-8 items-center justify-center rounded-sm bg-gradient-to-br ring-1">
												<Avatar className="size-8 rounded-sm after:rounded-sm">
													{activeTeam.image?.objectKey ? (
														<AvatarImage
															src={`/resources/images?objectKey=${activeTeam.image.objectKey}`}
															alt={
																activeTeam.image?.altText ||
																`${activeTeam.name} logo`
															}
															className="rounded-sm object-cover ring-2"
														/>
													) : null}
													<AvatarFallback className="text-sidebar-primary-foreground rounded-sm border-0 bg-transparent text-sm font-semibold ring-0">
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
									</button>
								}
								size="lg"
								className="group bg-background relative h-14 border px-3 py-2 transition-all duration-200"
							></SidebarMenuButton>
						}
						className="ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground peer/menu-button group/menu-button hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group bg-background relative flex h-14 w-full items-center gap-2 overflow-hidden rounded-lg border p-2 px-3 py-2 text-left text-sm outline-hidden transition-all duration-200 group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:font-medium [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate"
					></DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-full min-w-40 rounded-lg"
						align="start"
						side="bottom"
						sideOffset={4}
						style={{ width: 'var(--anchor-width)' }}
					>
						<DropdownMenuGroup>
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
										<div className="from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground ring-sidebar-primary/20 group-hover/item:from-sidebar-primary-foreground group-hover/item:to-sidebar-primary-foreground/80 group-hover/item:text-sidebar-primary group-hover/item:ring-sidebar-primary relative flex size-6 items-center justify-center rounded-sm bg-gradient-to-br ring-1 transition-colors">
											<Avatar className="size-6 rounded-sm after:rounded-sm">
												{userOrg.organization.image?.objectKey ? (
													<AvatarImage
														src={`/resources/images?objectKey=${userOrg.organization.image.objectKey}`}
														alt={
															userOrg.organization.image?.altText ||
															`${userOrg.organization.name} logo`
														}
														className="rounded-sm object-cover"
													/>
												) : null}
												<AvatarFallback className="text-sidebar-primary-foreground group-hover/item:text-sidebar-primary rounded-sm bg-transparent text-xs font-semibold transition-colors">
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
								className="gap-2 p-2"
								onClick={() => isMobile && toggleSidebar()}
								render={
									<Link
										to={`/${activeTeam.slug}/settings/members`}
										className="flex items-center gap-2"
									>
										<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
											<Icon name="user-plus" className="size-4" />
										</div>
										<div>
											<Trans>Invite members</Trans>
										</div>
									</Link>
								}
							></DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="gap-2 p-2"
								render={
									<Link
										to="/organizations/create"
										className="flex items-center gap-2"
									>
										<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
											<Icon name="plus" className="size-4" />
										</div>
										<div>
											<Trans>Add organization</Trans>
										</div>
									</Link>
								}
							></DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
