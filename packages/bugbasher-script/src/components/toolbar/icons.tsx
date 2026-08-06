import { iconStyles } from './styles'

export function RecordIcon({ className }: { className?: string }) {
	return <span className={`${iconStyles.record} ${className || ''}`} />
}

export function CommentIcon({ className }: { className?: string }) {
	return (
		<span className={`${iconStyles.comment} ${className || ''}`}>
			<span className="absolute -bottom-0.5 left-0.5 h-0 w-0 border-t-[3px] border-r-[3px] border-l-[3px] border-t-current border-r-transparent border-l-transparent" />
		</span>
	)
}

export function FrameIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			className={`tabler-icon tabler-icon-frame ${className || ''}`}
		>
			<path d="M4 7l16 0" />
			<path d="M4 17l16 0" />
			<path d="M7 4l0 16" />
			<path d="M17 4l0 16" />
		</svg>
	)
}

export function TypographyIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			className={`tabler-icon tabler-icon-typography ${className || ''}`}
		>
			<path d="M4 20l3 0" />
			<path d="M14 20l7 0" />
			<path d="M6.9 15l6.9 0" />
			<path d="M10.2 6.3l5.8 13.7" />
			<path d="M5 20l6 -16l2 0l7 16" />
		</svg>
	)
}

export function PhotoIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			className={`tabler-icon tabler-icon-photo ${className || ''}`}
		>
			<path d="M15 8h.01" />
			<path d="M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-12z" />
			<path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5" />
			<path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3" />
		</svg>
	)
}

export function PlusIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			className={`tabler-icon tabler-icon-plus ${className || ''}`}
		>
			<path d="M12 5l0 14" />
			<path d="M5 12l14 0" />
		</svg>
	)
}
