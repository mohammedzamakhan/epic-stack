import { cn } from '../utils/cn'

export const Divider = ({ className }: { className?: string }) => {
	return (
		<div className={cn('my-8 flex items-center justify-center', className)}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="234"
				height="14"
				fill="none"
				className="text-muted-foreground"
			>
				<path
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="3"
					d="M2 2c3.194 1.667 12.778 10 19.167 10 6.389 0 12.777-10 19.166-10 6.39 0 12.778 10 19.167 10 6.389 0 12.778-10 19.167-10 6.389 0 12.777 10 19.166 10C104.222 12 110.611 2 117 2c6.389 0 12.778 10 19.167 10 6.389 0 12.777-10 19.166-10 6.389 0 12.778 10 19.167 10 6.389 0 12.778-10 19.167-10 6.389 0 12.777 10 19.166 10 6.389 0 15.973-8.333 19.167-10"
				></path>
			</svg>
		</div>
	)
}
