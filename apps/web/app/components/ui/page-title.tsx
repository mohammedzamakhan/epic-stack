interface PageTitleProps {
	title: string
	description?: string
}

export function PageTitle({ title, description }: PageTitleProps) {
	return (
		<div>
			<h1 className="text-2xl font-bold font-medium">{title}</h1>
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
		</div>
	)
}
