import { cn } from '#app/utils/misc.tsx'

export function Logo({ className }: { className?: string }) {
	return (
		<div className={cn('flex gap-2', className)}>
			<span className="font-light">epic</span>
			<span className="font-bold">notes</span>
		</div>
	)
}
