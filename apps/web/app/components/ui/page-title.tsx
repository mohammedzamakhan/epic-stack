interface PageTitleProps {
	title: string
	description?: string
}

export function PageTitle({ title, description }: PageTitleProps) {
	return (
		<div className="flex flex-col gap-2">
			<h1 className="text-2xl font-bold font-medium">{title}</h1>
			{description && (
				<p className="text-muted-foreground text-md">{description}</p>
			)}
		</div>
	)
}
