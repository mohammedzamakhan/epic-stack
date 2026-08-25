import { cn } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Input } from '@repo/ui/input'
import { Label } from '@repo/ui/label'
import { Textarea } from '@repo/ui/textarea'
import { Icon } from '@repo/ui/icon'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { type CampaignChannel } from '../types/campaign.ts'

export interface CampaignFormProps {
	error?: string | null
	isSubmitting?: boolean
	cancelTo?: string
	showSmsProBadge?: boolean
	audienceField?: ReactNode
	submitLabel?: string
	submittingLabel?: string
}

const CHANNELS: Array<{
	value: CampaignChannel
	label: string
	icon: 'mail' | 'smartphone'
}> = [
	{ value: 'email', label: 'Email', icon: 'mail' },
	{ value: 'sms', label: 'SMS', icon: 'smartphone' },
]

export function CampaignForm({
	error,
	isSubmitting = false,
	cancelTo,
	showSmsProBadge = true,
	audienceField,
	submitLabel = 'Send now',
	submittingLabel = 'Sending...',
}: CampaignFormProps) {
	const [channel, setChannel] = useState<CampaignChannel>('email')

	return (
		<div className="space-y-6">
			{error ? <p className="text-destructive text-sm">{error}</p> : null}

			<div className="space-y-2">
				<Label>Channel</Label>
				<input type="hidden" name="channel" value={channel} />
				<div className="inline-flex rounded-lg border p-1">
					{CHANNELS.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => setChannel(option.value)}
							className={cn(
								'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
								channel === option.value
									? 'bg-muted text-foreground'
									: 'text-muted-foreground hover:text-foreground',
							)}
						>
							<Icon name={option.icon} className="size-4" />
							<span>{option.label}</span>
							{showSmsProBadge && option.value === 'sms' ? (
								<span className="text-muted-foreground text-[10px] font-normal tracking-wide uppercase">
									Pro
								</span>
							) : null}
						</button>
					))}
				</div>
			</div>

			<div className="space-y-5 rounded-lg border p-5">
				{audienceField}

				<div className="space-y-2">
					<Label htmlFor="name">Campaign name</Label>
					<Input id="name" name="name" placeholder="Summer promo" required />
				</div>

				{channel === 'email' ? (
					<div className="space-y-2">
						<Label htmlFor="subject">Subject</Label>
						<Input
							id="subject"
							name="subject"
							placeholder="Check out our new summer menu"
							required
						/>
					</div>
				) : null}

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-4">
						<Label htmlFor="content">Message</Label>
						<span className="text-muted-foreground text-xs">
							{'{{name}}'} supported
						</span>
					</div>
					<Textarea
						id="content"
						name="content"
						placeholder={
							channel === 'email'
								? 'Write your email. Use {{name}} to personalize.'
								: 'Write your text message. Max 160 characters.'
						}
						className="min-h-[180px] resize-y"
						required
					/>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3">
				{cancelTo ? (
					<Button
						type="button"
						variant="ghost"
						render={<Link to={cancelTo} />}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
				) : (
					<span />
				)}
				<Button type="submit" disabled={isSubmitting} className="gap-2">
					{isSubmitting ? (
						<>
							<Icon name="loader" className="size-4 animate-spin" />
							{submittingLabel}
						</>
					) : (
						<>
							<Icon name="send" className="size-4" />
							{submitLabel}
						</>
					)}
				</Button>
			</div>
		</div>
	)
}
