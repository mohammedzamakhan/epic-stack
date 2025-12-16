import { computePosition, flip, shift, offset } from '@floating-ui/dom'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { EmojiPicker } from 'frimousse'
import React, { useState, useRef, useEffect } from 'react'

interface EmojiPickerButtonProps {
	onEmojiSelect: (emoji: string) => void
	disabled?: boolean
}

export const EmojiPickerButton: React.FC<EmojiPickerButtonProps> = ({
	onEmojiSelect,
	disabled = false,
}) => {
	const [isOpen, setIsOpen] = useState(false)
	const [position, setPosition] = useState({ top: 0, left: 0 })
	const buttonRef = useRef<HTMLButtonElement>(null)
	const pickerRef = useRef<HTMLDivElement>(null)

	const handleEmojiSelect = ({ emoji }: { emoji: string }) => {
		onEmojiSelect(emoji)
		setIsOpen(false)
	}

	const updatePosition = async () => {
		if (!buttonRef.current || !pickerRef.current) return

		const { x, y } = await computePosition(
			buttonRef.current,
			pickerRef.current,
			{
				placement: 'top-start',
				middleware: [offset(8), flip(), shift({ padding: 8 })],
			},
		)

		setPosition({ top: y, left: x })
	}

	useEffect(() => {
		if (isOpen) {
			void updatePosition()
		}
	}, [isOpen])

	// Close on click outside
	useEffect(() => {
		if (!isOpen) return

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node

			// Don't close if clicking on the button
			if (buttonRef.current?.contains(target)) {
				return
			}

			// Don't close if clicking inside the picker
			if (pickerRef.current?.contains(target)) {
				return
			}

			// Close if clicking outside both
			setIsOpen(false)
		}

		// Add a small delay to avoid immediate closure when opening
		const timeoutId = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside)
		}, 50)

		return () => {
			clearTimeout(timeoutId)
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen])

	// Close on escape key
	useEffect(() => {
		if (!isOpen) return

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setIsOpen(false)
			}
		}

		document.addEventListener('keydown', handleEscape)
		return () => document.removeEventListener('keydown', handleEscape)
	}, [isOpen])

	const handleButtonClick = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsOpen(!isOpen)
	}

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				disabled={disabled}
				className="hover:bg-accent h-8 w-8 p-0"
				onClick={handleButtonClick}
				render={
					<button ref={buttonRef}>
						<Icon name="smile" className="h-4 w-4" />
						<span className="sr-only">Add emoji</span>
					</button>
				}
			></Button>

			{isOpen && (
				<div
					ref={pickerRef}
					className="bg-popover text-popover-foreground fixed z-[9999] min-w-[300px] overflow-hidden rounded-md border p-0 shadow-md"
					style={{
						top: position.top,
						left: position.left,
						pointerEvents: 'auto',
					}}
					onMouseDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
				>
					<EmojiPicker.Root
						onEmojiSelect={handleEmojiSelect}
						className="bg-background flex h-[368px] w-fit flex-col"
					>
						<EmojiPicker.Search className="bg-muted z-10 mx-2 mt-2 appearance-none rounded-md px-2.5 py-2 text-sm" />
						<EmojiPicker.Viewport className="relative flex-1">
							<EmojiPicker.Loading className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
								Loading…
							</EmojiPicker.Loading>
							<EmojiPicker.Empty className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
								No emoji found.
							</EmojiPicker.Empty>
							<EmojiPicker.List
								className="pb-1.5 select-none"
								components={{
									CategoryHeader: ({ category, ...props }) => (
										<div
											className="bg-background text-muted-foreground px-3 pt-3 pb-1.5 text-xs font-medium"
											{...props}
										>
											{category.label}
										</div>
									),
									Row: ({ children, ...props }) => (
										<div className="scroll-my-1.5 px-1.5" {...props}>
											{children}
										</div>
									),
									Emoji: ({ emoji, ...props }) => (
										<button
											type="button"
											className="data-[active]:bg-accent flex size-8 items-center justify-center rounded-md text-lg"
											{...props}
										>
											{emoji.emoji}
										</button>
									),
								}}
							/>
						</EmojiPicker.Viewport>
					</EmojiPicker.Root>
				</div>
			)}
		</>
	)
}
