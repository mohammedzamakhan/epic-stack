import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { useState, useRef } from 'react'
import { cn } from '#app/utils/misc.tsx'


interface CommentImageUploadProps {
	onImagesSelected: (files: File[]) => void
	maxImages?: number
	disabled?: boolean
	className?: string
}

export function CommentImageUpload({
	onImagesSelected,
	maxImages = 3,
	disabled = false,
	className,
}: CommentImageUploadProps) {
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		if (!disabled) {
			setIsDragging(true)
		}
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)

		if (disabled) return

		const files = Array.from(e.dataTransfer.files).filter((file) =>
			file.type.startsWith('image/'),
		)

		if (files.length > 0) {
			onImagesSelected(files.slice(0, maxImages))
		}
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []).filter((file) =>
			file.type.startsWith('image/'),
		)

		if (files.length > 0) {
			onImagesSelected(files.slice(0, maxImages))
		}

		// Clear the input so the same file can be selected again
		e.target.value = ''
	}

	const handleClick = () => {
		if (!disabled && fileInputRef.current) {
			fileInputRef.current.click()
		}
	}

	return (
		<div ref={containerRef} className={cn('relative', className)}>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				onChange={handleFileSelect}
				className="sr-only"
				disabled={disabled}
			/>

			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={handleClick}
				disabled={disabled}
				className="h-8 w-8 p-0"
				title="Add images"
			>
				<Icon name="paperclip" className="h-4 w-4" />
			</Button>

			{/* Optional: Drop zone overlay when dragging */}
			<div
				className={cn(
					'absolute inset-0 rounded border-2 border-dashed transition-all',
					isDragging
						? 'border-primary bg-primary/5 opacity-100'
						: 'pointer-events-none border-transparent opacity-0',
				)}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			/>
		</div>
	)
}
