import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useState,
} from 'react'
import { cn } from '#app/utils/misc.tsx'

interface MentionItem {
	id: string
	name: string
}

interface MentionListProps {
	items: MentionItem[]
	command: (item: { id: string; label: string }) => void
}

interface MentionListRef {
	onKeyDown: (args: { event: React.KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
	(props, ref) => {
		const [selectedIndex, setSelectedIndex] = useState(0)

		const selectItem = (index: number) => {
			const item = props.items[index]
			if (item) {
				// Keep the name as label for display, but the id will be stored in data-id attribute
				props.command({ id: item.id, label: item.name })
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
				className="bg-popover text-popover-foreground animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 z-[9999] min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md"
				style={{ pointerEvents: 'auto' }}
			>
				{props.items.length ? (
					props.items.map((item, index) => (
						<button
							key={index}
							className={cn(
								'hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none',
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
							{item.name}
						</button>
					))
				) : (
					<div className="text-muted-foreground py-6 text-center text-sm">
						No results
					</div>
				)}
			</div>
		)
	},
)

MentionList.displayName = 'MentionList'
