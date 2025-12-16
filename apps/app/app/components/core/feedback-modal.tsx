import { Trans, msg } from '@lingui/macro'
import { useLingui } from '@lingui/react'

import { Button } from '@repo/ui/button'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@repo/ui/dialog'
import { Icon } from '@repo/ui/icon'
import { Textarea } from '@repo/ui/textarea'
import { useState } from 'react'
import { useFetcher } from 'react-router'

type FeedbackModalProps = {
	isOpen: boolean
	onOpenChange: (isOpen: boolean) => void
}

export default function FeedbackModal({
	isOpen,
	onOpenChange,
}: FeedbackModalProps) {
	const { _ } = useLingui()
	const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
	const [feedback, setFeedback] = useState('')

	const icons = [
		{ id: 'negative', icon: 'frown', label: _(msg`Negative feedback`) },
		{ id: 'neutral', icon: 'meh', label: _(msg`Neutral feedback`) },
		{ id: 'positive', icon: 'smile', label: _(msg`Positive feedback`) },
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
					<DialogTitle>
						<Trans>Give feedback</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							We'd love to hear what went well or how we can improve the product
							experience.
						</Trans>
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-6">
					<Textarea
						placeholder={_(msg`Your feedback`)}
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
								<Trans>Cancel</Trans>
							</Button>
							<Button onClick={handleSubmit}>
								<Trans>Submit</Trans>
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
