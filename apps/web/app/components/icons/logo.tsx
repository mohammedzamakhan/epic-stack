import { cn } from '#app/utils/misc.tsx'

export function Logo({ className }: { className?: string }) {
	return (
		<div className={cn('group grid leading-snug', className)}>
			<span className="font-light transition group-hover:-translate-x-1">
				epic
			</span>
			<span className="font-bold transition group-hover:translate-x-1">
				notes
			</span>
		</div>
	)
}
