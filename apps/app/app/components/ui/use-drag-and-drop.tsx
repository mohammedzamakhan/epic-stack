import { useState, useCallback } from 'react'

interface UseDragAndDropOptions {
	disabled: boolean
	onFileUpload: (file: File) => void
	acceptFilter: (file: File) => boolean
}

/**
 * Shared hook for drag and drop file upload functionality
 * Handles drag events and file filtering for upload components
 */
export function useDragAndDrop({
	disabled,
	onFileUpload,
	acceptFilter,
}: UseDragAndDropOptions) {
	const [isDragging, setIsDragging] = useState(false)

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			if (!disabled) {
				setIsDragging(true)
			}
		},
		[disabled],
	)

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDragging(false)

			if (disabled) return

			const files = Array.from(e.dataTransfer.files).filter(acceptFilter)

			if (files.length > 0) {
				for (const file of files) {
					onFileUpload(file)
				}
			}
		},
		[disabled, onFileUpload, acceptFilter],
	)

	return {
		isDragging,
		handleDragOver,
		handleDragLeave,
		handleDrop,
	}
}
