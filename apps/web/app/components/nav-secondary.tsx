import * as React from 'react'
import { useRef } from 'react'

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '#app/components/ui/sidebar'

export function NavSecondary({
	items,
	...props
}: {
	items: {
		title: string
		url: string
		icon: React.ComponentType<any>
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
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								onMouseEnter={() => handleMenuItemMouseEnter(item.title)}
								onMouseLeave={() => handleMenuItemMouseLeave(item.title)}
							>
								<a href={item.url}>
									<item.icon
										ref={(ref: any) => (iconRefs.current[item.title] = ref)}
										size={16}
									/>
									<span>{item.title}</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
