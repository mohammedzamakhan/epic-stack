import { useState } from 'react'
import { Link } from 'react-router'
import { Icon } from '#app/components/ui/icon'
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from '#app/components/ui/sidebar'

export function NavMain({
	items,
}: {
	items: {
		title: string
		url: string
		icon?: unknown
		isActive: boolean
		items?: {
			title: string
			url: string
			isActive: boolean
		}[]
	}[]
}) {
	const [openItems, setOpenItems] = useState<Set<string>>(new Set())

	const toggleItem = (title: string) => {
		setOpenItems((prev) => {
			const newSet = new Set(prev)
			if (newSet.has(title)) {
				newSet.delete(title)
			} else {
				newSet.add(title)
			}
			return newSet
		})
	}

	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					{items.map((item) => {
						const hasSubItems = item.items && item.items.length > 0
						const isOpen = openItems.has(item.title)

						return (
							<SidebarMenuItem key={item.title}>
								{hasSubItems ? (
									<>
										<SidebarMenuButton
											onClick={() => toggleItem(item.title)}
											tooltip={item.title}
											isActive={item.isActive}
											className="w-full justify-between"
										>
											<div className="flex items-center">
												{/* <item.icon /> */}
												<span>{item.title}</span>
											</div>
											<Icon
												name={isOpen ? 'chevron-down' : 'chevron-right'}
												className="h-4 w-4"
											/>
										</SidebarMenuButton>
										{isOpen && (
											<SidebarMenuSub>
												{item.items?.map((subItem) => (
													<SidebarMenuSubItem key={subItem.title}>
														<SidebarMenuSubButton
															asChild
															isActive={subItem.isActive}
														>
															<Link to={subItem.url}>
																<span>{subItem.title}</span>
															</Link>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										)}
									</>
								) : (
									<SidebarMenuButton
										asChild
										tooltip={item.title}
										isActive={item.isActive}
									>
										<Link to={item.url}>
											{/* <item.icon /> */}
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								)}
							</SidebarMenuItem>
						)
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
