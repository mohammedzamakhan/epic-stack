import * as React from 'react'
import { useRef } from 'react'

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '#app/components/ui/sidebar'
import { Link } from 'react-router'

export function NavSecondary({
	items,
	...props
}: {
	items: {
		title: string
		url?: string
		icon: React.ComponentType<any>
		onClick?: () => void
	}[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
	const iconRefs = useRef<{ [key: string]: any }>({})

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
		<SidebarGroup {...props}>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => (
						<li key={item.title}>
							{item.onClick ? (
								<SidebarMenuButton onClick={item.onClick}>
									<item.icon className="mr-2" />
									{item.title}
								</SidebarMenuButton>
							) : (
								<SidebarMenuButton as={item.url ? Link : "button"} to={item.url}>
									<item.icon className="mr-2" />
									{item.title}
								</SidebarMenuButton>
							)}
						</li>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
