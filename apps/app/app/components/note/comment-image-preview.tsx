import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { useState, useEffect } from 'react'
import { cn } from '#app/utils/misc.tsx'

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
			previewUrls.forEach((url) => {
				if (url.startsWith('blob:')) {
					URL.revokeObjectURL(url)
				}
			})
		}
	}, [files, previewUrls])

	if (files.length === 0) {
		return null
	}

	return (
		<div className={cn('flex flex-wrap gap-2', className)}>
			{files.map((file, index) => (
				<div key={`${file.name}-${index}`} className="group relative">
					<div className="bg-muted h-16 w-16 overflow-hidden rounded-lg border">
						{previewUrls[index] ? (
							<img
								src={previewUrls[index]}
								alt={file.name}
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center">
								<Icon name="image" className="text-muted-foreground h-6 w-6" />
							</div>
						)}
					</div>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						className="absolute -top-1 -right-1 h-5 min-h-[44px] w-5 min-w-[44px] p-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
						onClick={() => onRemove(index)}
						aria-label="Remove image"
					>
						<Icon name="x" className="h-3 w-3" />
					</Button>
				</div>
			))}
		</div>
	)
}
