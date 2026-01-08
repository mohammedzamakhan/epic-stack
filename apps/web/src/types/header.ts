export type HeaderNavItem = {
	menuType: 'link' | 'megaMenu'
	menuLabel: string
	link?: {
		type: 'reference' | 'custom'
		reference?: {
			relationTo: 'pages' | 'posts'
			value: string | { id: string }
		}
		url?: string
		label?: string
		newTab?: boolean
	}
	megaMenuColumns?: Array<{
		columnTitle: string
		columnDescription?: string
		links: Array<{
			link: {
				type: 'reference' | 'custom'
				reference?: {
					relationTo: 'pages' | 'posts'
					value: string | { id: string }
				}
				url?: string
				label: string
				newTab?: boolean
			}
		}>
	}>
}

export type HeaderData = {
	navItems: HeaderNavItem[]
}
