import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Icon, type IconName } from '@repo/ui/icon'
import { Link } from 'react-router'

interface EmptyStateProps {
	title: string
	description: string
	icons?: IconName[]
	action?: {
		label: string
		href: string
	}
	className?: string
}

export function EmptyState({
	title,
	description,
	icons = [],
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				'dark:bg-background bg-muted w-full rounded-xl p-1 text-center',
				className,
			)}
		>
			<div className="bg-background ring-border dark:bg-muted/50 rounded-lg p-14 shadow-sm ring-1">
				<div className="flex justify-center">
					<div className="bg-background ring-border grid size-12 place-items-center rounded-xl shadow-lg ring-1">
						{icons[0] && (
							<Icon name={icons[0]} className="text-muted-foreground h-6 w-6" />
						)}
					</div>
				</div>
				<h2 className="text-foreground mt-6 font-medium">{title}</h2>
				<p className="text-muted-foreground mt-1 text-sm">{description}</p>
				{action && (
					<Button className="mt-4 shadow-sm" render={<Link to={action.href} />}>
						{action.label}
					</Button>
				)}
			</div>
		</div>
	)
}
