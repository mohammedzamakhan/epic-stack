import { cva } from 'class-variance-authority'

export const toolbarRootStyles = cva(
	['pointer-events-none fixed z-[2147483647]', 'font-sans'].join(' '),
)

export const toolbarContainerStyles = cva(
	[
		'absolute bottom-4 left-1/2 -translate-x-1/2',
		'z-50 flex h-10 w-fit items-center gap-2',
		'bg-background rounded-xl px-2 shadow-lg',
		'pointer-events-auto',
		'select-none',
		'border-border border',
	].join(' '),
	{
		variants: {
			isDragging: {
				true: 'cursor-grabbing',
				false: '',
			},
		},
		defaultVariants: {
			isDragging: false,
		},
	},
)

export const toolbarButtonStyles = cva(
	[
		'inline-flex w-fit shrink-0 items-center justify-center gap-1',
		'rounded-md text-xs leading-none whitespace-nowrap',
		'focus-visible:outline-ring transition-all focus-visible:outline-1',
		'focus-visible:ring-ring/50 focus-visible:ring-[4px]',
		'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
		'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
		'dark:aria-invalid:ring-destructive/40',
		'[&_svg]:pointer-events-none [&_svg]:shrink-0',
		'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
		'h-7 px-2 py-1 font-normal has-[>svg]:px-2',
		"[&_svg:not([class*='size-'])]:size-4",
	].join(' '),
	{
		variants: {
			variant: {
				default: [
					'bg-input text-input-foreground hover:bg-input/80 justify-start',
				].join(' '),
				icon: [
					'hover:bg-accent/10 bg-transparent data-[size=icon]:size-7',
				].join(' '),
				recording: [
					'border-red-500 bg-red-500 text-white',
					'hover:border-red-600 hover:bg-red-600',
					'focus:ring-red-400',
					'animate-pulse',
				].join(' '),
				commenting: [
					'border-blue-500 bg-blue-500 text-white',
					'hover:border-blue-600 hover:bg-blue-600',
					'focus:ring-blue-400',
				].join(' '),
			},
			size: {
				default: '',
				icon: 'size-7',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

export const toolbarDragHandleStyles = cva(
	[
		'mr-1 h-4 w-1',
		'bg-gradient-to-b from-gray-300 via-transparent to-gray-300',
		'bg-[length:100%_4px] bg-repeat-y',
		'cursor-grab',
		'hover:from-gray-400 hover:to-gray-400',
		'active:cursor-grabbing',
	].join(' '),
)

export const toolbarGroupStyles = cva(['flex items-center'].join(' '))

export const iconStyles = {
	record: ['w-2 h-2 rounded-full', 'bg-current'].join(' '),
	comment: ['w-2.5 h-2.5', 'border border-current rounded-sm', 'relative'].join(
		' ',
	),
}
