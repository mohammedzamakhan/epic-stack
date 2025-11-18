import { useState } from 'react'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@repo/ui/dialog'
import { Icon } from '@repo/ui/icon'

interface CacheConfirmationDialogProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	title: string
	description: string
	confirmText: string
	variant?: 'destructive' | 'default'
	isLoading?: boolean
	details?: {
		type: string
		count?: number
		keys?: string[]
	}
}

export function CacheConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	confirmText,
	variant = 'destructive',
	isLoading = false,
	details,
}: CacheConfirmationDialogProps) {
	const [confirmed, setConfirmed] = useState(false)

	const handleConfirm = () => {
		if (!confirmed) {
			setConfirmed(true)
			return
		}
		onConfirm()
	}

	const handleClose = () => {
		setConfirmed(false)
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon name="alert-triangle" className="text-destructive h-5 w-5" />
						{title}
					</DialogTitle>
					<DialogDescription className="space-y-2">
						<p>{description}</p>
						{details && (
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium">Cache Type:</span>
									<Badge variant="outline">{details.type.toUpperCase()}</Badge>
								</div>
								{details.count && (
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium">Entries:</span>
										<Badge variant="secondary">{details.count}</Badge>
									</div>
								)}
								{details.keys && details.keys.length > 0 && (
									<div className="space-y-1">
										<span className="text-sm font-medium">Keys to delete:</span>
										<div className="max-h-32 space-y-1 overflow-y-auto">
											{details.keys.slice(0, 10).map((key, index) => (
												<div
													key={index}
													className="bg-muted rounded p-1 font-mono text-xs"
												>
													{key}
												</div>
											))}
											{details.keys.length > 10 && (
												<div className="text-muted-foreground text-xs">
													... and {details.keys.length - 10} more
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						)}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
					<Button variant="outline" onClick={handleClose} disabled={isLoading}>
						Cancel
					</Button>
					<Button
						variant={variant}
						onClick={handleConfirm}
						disabled={isLoading}
						className="w-full sm:w-auto"
					>
						{isLoading ? (
							<>
								<Icon name="loader" className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : (
							<>
								<Icon name="trash-2" className="h-4 w-4" />
								{confirmed ? confirmText : 'Confirm'}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
