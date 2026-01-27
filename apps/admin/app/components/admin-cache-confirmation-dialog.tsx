import { Trans } from '@lingui/macro'
import { Badge } from '@repo/ui/badge'
import { Button } from '@repo/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@repo/ui/dialog'
import { Icon } from '@repo/ui/icon'
import { useState } from 'react'

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
	const remaining = details?.keys && details.keys.length - 10
	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="overscroll-contain sm:max-w-md">
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
									<span className="text-sm font-medium">
										<Trans>Cache Type:</Trans>
									</span>
									<Badge variant="outline">{details.type.toUpperCase()}</Badge>
								</div>
								{details.count && (
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium">
											<Trans>Entries:</Trans>
										</span>
										<Badge variant="secondary">{details.count}</Badge>
									</div>
								)}
								{details.keys && details.keys.length > 0 && (
									<div className="space-y-1">
										<span className="text-sm font-medium">
											<Trans>Keys to delete:</Trans>
										</span>
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
													<Trans>... and {remaining} more</Trans>
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
						<Trans>Cancel</Trans>
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
								<Trans>Processing...</Trans>
							</>
						) : (
							<>
								<Icon name="trash-2" className="h-4 w-4" />
								{confirmed ? confirmText : <Trans>Confirm</Trans>}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
