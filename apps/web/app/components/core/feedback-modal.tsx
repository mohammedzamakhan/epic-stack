import { useState } from 'react'
import { useFetcher } from 'react-router'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Textarea } from '#app/components/ui/textarea.tsx'

type FeedbackModalProps = {
	isOpen: boolean
	onOpenChange: (isOpen: boolean) => void
}

export default function FeedbackModal({
	isOpen,
	onOpenChange,
}: FeedbackModalProps) {
	const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
	const [feedback, setFeedback] = useState('')

	const icons = [
		{ id: 'negative', icon: 'frown', label: 'Negative feedback' },
		{ id: 'neutral', icon: 'meh', label: 'Neutral feedback' },
		{ id: 'positive', icon: 'smile', label: 'Positive feedback' },
	]

	const fetcher = useFetcher()

	const handleSubmit = () => {
		if (!selectedIcon || !feedback) {
			// Or show some validation message
			return
		}
		void fetcher.submit(
			{
				message: feedback,
				type: selectedIcon,
			},
			{
				method: 'POST',
				action: '/resources/feedback',
			},
		)
		onOpenChange(false)
		setFeedback('')
		setSelectedIcon(null)
	}

	const handleCancel = () => {
		onOpenChange(false)
		setFeedback('')
		setSelectedIcon(null)
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						Give feedback
					</DialogTitle>
					<DialogDescription>
						We'd love to hear what went well or how we can improve the product
						experience.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-6">
					<Textarea
						placeholder="Your feedback"
						value={feedback}
						onChange={(e) => setFeedback(e.target.value)}
						className="min-h-[120px] resize-none"
					/>
					<div className="flex items-center justify-between">
						<div className="flex gap-2">
							{icons.map((iconItem) => {
								return (
									<button
										key={iconItem.id}
										onClick={() => setSelectedIcon(iconItem.id)}
										className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
											selectedIcon === iconItem.id
												? 'border-primary bg-primary/10'
												: 'border-border hover:border-primary/50'
										}`}
										aria-label={iconItem.label}
									>
										<Icon
											name={iconItem.icon as any}
											className="text-muted-foreground size-5"
										/>
									</button>
								)
							})}
						</div>
						<div className="flex gap-3">
							<Button variant="ghost" onClick={handleCancel}>
								Cancel
							</Button>
							<Button onClick={handleSubmit}>Submit</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
