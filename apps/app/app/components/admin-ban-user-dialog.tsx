import { useState } from 'react'
import { Form, useSubmit } from 'react-router'

import {
	Button,
	Checkbox,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
	Textarea,
	Icon,
} from '@repo/ui'

interface BanUserDialogProps {
	user: {
		id: string
		name: string | null
		email: string
		username: string
	}
	isOpen: boolean
	onClose: () => void
}

export function BanUserDialog({ user, isOpen, onClose }: BanUserDialogProps) {
	const [reason, setReason] = useState('')
	const [hasExpiration, setHasExpiration] = useState(false)
	const [expirationDate, setExpirationDate] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const submit = useSubmit()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!reason.trim()) {
			return
		}

		setIsSubmitting(true)

		const formData = new FormData()
		formData.append('intent', 'ban')
		formData.append('reason', reason.trim())

		if (hasExpiration && expirationDate) {
			formData.append('expiresAt', expirationDate)
		}

		void submit(formData, {
			method: 'POST',
			action: `/admin/users/${user.id}/ban`,
		})

		// Close dialog immediately - the redirect will handle the rest
		handleClose()
	}

	const handleClose = () => {
		if (!isSubmitting) {
			setReason('')
			setHasExpiration(false)
			setExpirationDate('')
			onClose()
		}
	}

	// Set minimum date to tomorrow
	const tomorrow = new Date()
	tomorrow.setDate(tomorrow.getDate() + 1)
	const minDate = tomorrow.toISOString().split('T')[0]

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Icon name="ban" className="text-destructive h-5 w-5" />
						Ban User
					</DialogTitle>
					<DialogDescription>
						You are about to ban <strong>{user.name || user.username}</strong> (
						{user.email}). This will prevent them from accessing the
						application.
					</DialogDescription>
				</DialogHeader>

				<Form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="ban-reason">
							Reason for ban <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="ban-reason"
							placeholder="Enter the reason for banning this user..."
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							required
							disabled={isSubmitting}
							className="min-h-[100px]"
						/>
					</div>

					<div className="space-y-3">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="has-expiration"
								checked={hasExpiration}
								onCheckedChange={(checked) => {
									setHasExpiration(checked === true)
									if (!checked) {
										setExpirationDate('')
									}
								}}
								disabled={isSubmitting}
							/>
							<Label htmlFor="has-expiration" className="text-sm">
								Set expiration date (optional)
							</Label>
						</div>

						{hasExpiration && (
							<div className="space-y-2">
								<Label
									htmlFor="expiration-date"
									className="flex items-center gap-2"
								>
									<Icon name="calendar" className="h-4 w-4" />
									Expiration Date
								</Label>
								<Input
									id="expiration-date"
									type="date"
									value={expirationDate}
									onChange={(e) => setExpirationDate(e.target.value)}
									min={minDate}
									disabled={isSubmitting}
								/>
								<p className="text-muted-foreground text-xs">
									The ban will be automatically lifted on this date. Leave empty
									for permanent ban.
								</p>
							</div>
						)}
					</div>

					<DialogFooter className="gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="destructive"
							disabled={!reason.trim() || isSubmitting}
							className="gap-2"
						>
							{isSubmitting ? (
								<>
									<div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
									Banning...
								</>
							) : (
								<>
									<Icon name="ban" className="h-4 w-4" />
									Ban User
								</>
							)}
						</Button>
					</DialogFooter>
				</Form>
			</DialogContent>
		</Dialog>
	)
}
