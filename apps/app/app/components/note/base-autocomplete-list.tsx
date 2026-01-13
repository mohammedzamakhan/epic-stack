import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useState,
} from 'react'
import { cn } from '#app/utils/misc.tsx'

export interface AutocompleteListRef {
	onKeyDown: (args: { event: React.KeyboardEvent }) => boolean
}

interface BaseAutocompleteListProps<T> {
	items: T[]
	onSelectItem: (item: T, index: number) => void
	renderItem: (item: T, index: number) => React.ReactNode
	noResultsMessage?: string
	className?: string
}

export const BaseAutocompleteList = forwardRef<
	AutocompleteListRef,
	BaseAutocompleteListProps<any>
>((props, ref) => {
	const [selectedIndex, setSelectedIndex] = useState(0)

	const selectItem = (index: number) => {
		const item = props.items[index]
		if (item) {
			props.onSelectItem(item, index)
		}
	}

	const upHandler = () => {
		setSelectedIndex(
			(selectedIndex + props.items.length - 1) % props.items.length,
		)
	}

	const downHandler = () => {
		setSelectedIndex((selectedIndex + 1) % props.items.length)
	}

	const enterHandler = () => {
		selectItem(selectedIndex)
	}

	useEffect(() => setSelectedIndex(0), [props.items])

	useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }: { event: React.KeyboardEvent }) => {
			if (event.key === 'ArrowUp') {
				upHandler()
				return true
			}

			if (event.key === 'ArrowDown') {
				downHandler()
				return true
			}

			if (event.key === 'Enter') {
				enterHandler()
				return true
			}

			return false
		},
	}))

	return (
		<div
			className={cn(
				'bg-popover text-popover-foreground animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 z-[9999] overflow-hidden rounded-md border p-1 shadow-md',
				props.className,
			)}
			style={{ pointerEvents: 'auto' }}
		>
			{props.items.length ? (
				props.items.map((item, index) => (
					<button
						key={index}
						className={cn(
							'hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none focus-visible:ring-2',
							index === selectedIndex && 'bg-accent text-accent-foreground',
						)}
						onClick={(e) => {
							e.preventDefault()
							e.stopPropagation()
							selectItem(index)
						}}
						onMouseDown={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
					>
						{props.renderItem(item, index)}
					</button>
				))
			) : (
				<div className="text-muted-foreground py-6 text-center text-sm">
					{props.noResultsMessage || 'No results'}
				</div>
			)}
		</div>
	)
})

BaseAutocompleteList.displayName = 'BaseAutocompleteList'
