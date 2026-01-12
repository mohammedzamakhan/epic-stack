import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from '@repo/ui/sidebar'
import * as React from 'react'
import { useRef } from 'react'

import { Link } from 'react-router'

type NavItem = {
	title: string
	icon: React.ComponentType<any>
} & (
	| { url: string; onClick?: never; target?: string }
	| { url?: never; onClick: () => void }
)

export function NavSecondary({
	items,
	...props
}: {
	items: NavItem[]
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
								onClick={item.onClick}
								onMouseEnter={() => handleMenuItemMouseEnter(item.title)}
								onMouseLeave={() => handleMenuItemMouseLeave(item.title)}
								render={
									item.url ? (
										<Link to={item.url} target={item.target}>
											<item.icon
												ref={(ref: any) => (iconRefs.current[item.title] = ref)}
												size={16}
											/>
											<span>{item.title}</span>
										</Link>
									) : (
										<button>
											<item.icon
												ref={(ref: any) => (iconRefs.current[item.title] = ref)}
												size={16}
											/>
											<span>{item.title}</span>
										</button>
									)
								}
							></SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	)
}
