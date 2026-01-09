import { Icon } from '../icon'
import { cn } from '../../lib/utils'

function Spinner({
	className,
	...props
}: Omit<React.ComponentProps<typeof Icon>, 'name'>) {
	return (
		<Icon
			name="loader"
			role="status"
			aria-label="Loading"
			className={cn('size-4 animate-spin', className)}
			{...props}
		/>
	)
}

export { Spinner }
