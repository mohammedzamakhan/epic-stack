import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { cn } from '#app/utils/misc'

interface CommentImagePreviewProps {
	files: File[]
	onRemove: (index: number) => void
	className?: string
}

export function CommentImagePreview({
	files,
	onRemove,
	className,
}: CommentImagePreviewProps) {
	const [previewUrls, setPreviewUrls] = useState<string[]>([])

	useEffect(() => {
		// Create preview URLs for all files
		const urls: string[] = []
		const readers: FileReader[] = []

		files.forEach((file, index) => {
			const reader = new FileReader()
			readers.push(reader)
			
			reader.onload = (e) => {
				if (e.target?.result) {
					urls[index] = e.target.result as string
					// Update state when all URLs are ready
					if (urls.filter(Boolean).length === files.length) {
						setPreviewUrls([...urls])
					}
				}
			}
			
			reader.readAsDataURL(file)
		})

		// Cleanup function to revoke URLs
		return () => {
			previewUrls.forEach(url => {
				if (url.startsWith('blob:')) {
					URL.revokeObjectURL(url)
				}
			})
		}
	}, [files])

	if (files.length === 0) {
		return null
	}

	return (
		<div className={cn('flex flex-wrap gap-2', className)}>
			{files.map((file, index) => (
				<div key={`${file.name}-${index}`} className="relative group">
					<div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted">
						{previewUrls[index] ? (
							<img
								src={previewUrls[index]}
								alt={file.name}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<Icon name="image" className="h-6 w-6 text-muted-foreground" />
							</div>
						)}
					</div>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
						onClick={() => onRemove(index)}
					>
						<Icon name="cross-1" className="h-3 w-3" />
					</Button>
				</div>
			))}
		</div>
	)
}