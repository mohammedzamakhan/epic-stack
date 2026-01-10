export type FooterLink = {
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
}

export type FooterColumn = {
	title: string
	links: FooterLink[]
}

export type FooterData = {
	columns: FooterColumn[]
	copyrightText?: string
	tagline?: string
}
