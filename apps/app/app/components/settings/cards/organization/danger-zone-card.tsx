import { useState } from 'react'
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Checkbox,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	Input,
	Label,
} from '@repo/ui'
import { Form } from 'react-router'

export default function DangerZoneCard({
	organization,
}: {
	organization: { id: string; name: string }
}) {
	const [isOpen, setIsOpen] = useState(false)
	const [confirmationText, setConfirmationText] = useState('')
	const [isConfirmed, setIsConfirmed] = useState(false)

	const isDeleteEnabled = confirmationText === organization.name && isConfirmed

	const handleSubmit = () => {
		if (isDeleteEnabled) {
			// The form will handle the actual submission
			setIsOpen(false)
		}
	}

	return (
		<Card className="border-destructive/20 bg-destructive/5 dark:bg-destructive/30">
			<CardHeader>
				<CardTitle>
					All your data will be permanently removed from our servers.
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogTrigger asChild>
						<Button variant="destructive">Delete organization</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="text-destructive">
								Delete organization?
							</DialogTitle>
							<DialogDescription>
								By deleting your organization you and your team will lose access
								and all data will be lost. This is a permanent action and cannot
								be undone.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="confirmation">
									Type the organization name "{organization.name}" to confirm.
								</Label>
								<Input
									id="confirmation"
									value={confirmationText}
									onChange={(e) => setConfirmationText(e.target.value)}
									placeholder={organization.name}
									className="mt-2"
								/>
							</div>

							<div className="flex space-x-2">
								<Checkbox
									id="understand"
									checked={isConfirmed}
									onCheckedChange={(checked) =>
										setIsConfirmed(checked === true)
									}
									className="mt-1"
								/>
								<Label htmlFor="understand" className="text-sm">
									I'll not be able to access the organization and its data
									anymore
								</Label>
							</div>
						</div>

						<DialogFooter className="gap-2">
							<Button variant="outline" onClick={() => setIsOpen(false)}>
								Cancel
							</Button>
							<Form method="POST" onSubmit={handleSubmit}>
								<input
									type="hidden"
									name="intent"
									value="delete-organization"
								/>
								<Button
									type="submit"
									variant="destructive"
									disabled={!isDeleteEnabled}
								>
									Delete organization
								</Button>
							</Form>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</CardContent>
		</Card>
	)
}
