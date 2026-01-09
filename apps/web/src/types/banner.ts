export type BannerData = {
	isEnabled: boolean
	type: 'info' | 'warning' | 'error' | 'success'
	content: string
	addLink: boolean
	link?: {
		type: 'reference' | 'custom'
		reference?: {
			relationTo: 'pages' | 'posts'
			value: { id: string; slug: string }
		}
		url?: string
		label?: string
		newTab?: boolean
		appearance?: 'default' | 'outline'
	}
}
