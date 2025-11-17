import { useRef, useState } from 'react'
import { Link } from 'react-router'

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	Icon,
} from '@repo/ui'

export function NavMain({
	items,
}: {
	items: {
		title: string
		url: string
		icon?: React.ComponentType<any>
		isActive: boolean
		items?: {
			title: string
			url: string
			isActive: boolean
		}[]
	}[]
}) {
	const [openItems, setOpenItems] = useState<Set<string>>(new Set())
	const iconRefs = useRef<{ [key: string]: any }>({})

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

	const handleMenuItemMouseEnter = (title: string) => {
		const iconRef = iconRefs.current[title]
		if (iconRef?.startAnimation) {
			iconRef.startAnimation()
		}
	}

	const handleMenuItemMouseLeave = (title: string) => {
		const iconRef = iconRefs.current[title]
		if (iconRef?.stopAnimation) {
			iconRef.stopAnimation()
		}
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
											onMouseEnter={() => handleMenuItemMouseEnter(item.title)}
											onMouseLeave={() => handleMenuItemMouseLeave(item.title)}
										>
											<div className="flex items-center gap-2">
												{item.icon && (
													<item.icon
														ref={(ref: any) =>
															(iconRefs.current[item.title] = ref)
														}
														size={16}
													/>
												)}
												<span>{item.title}</span>
											</div>
											<Icon
												name={isOpen ? 'chevron-down' : 'chevron-right'}
												className="h-4 w-4 rtl:rotate-180"
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
										onMouseEnter={() => handleMenuItemMouseEnter(item.title)}
										onMouseLeave={() => handleMenuItemMouseLeave(item.title)}
									>
										<Link to={item.url} className="flex items-center gap-2">
											{item.icon && (
												<item.icon
													ref={(ref: any) =>
														(iconRefs.current[item.title] = ref)
													}
													size={16}
												/>
											)}
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
