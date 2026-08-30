import { type UIMessage } from 'ai'
import { Avatar, type Avatar as AvatarType } from '@repo/ui/avatar'
import { type ComponentProps, type HTMLAttributes } from 'react'

import { cn } from '@repo/ui'

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
	from: UIMessage['role']
}

export const Message = ({ className, from, ...props }: MessageProps) => (
	<div
		className={cn(
			'flex w-full',
			from === 'user' ? 'justify-end' : 'justify-start',
			className,
		)}
		{...props}
	/>
)

export type MessageContentProps = HTMLAttributes<HTMLDivElement> & {
	from?: UIMessage['role']
}

export const MessageContent = ({
	children,
	className,
	from,
	...props
}: MessageContentProps) => {
	const isUser = from === 'user'
	return (
		<div
			className={cn(
				'max-w-[min(78ch,100%)] text-sm leading-relaxed break-words',
				isUser && 'bg-muted text-foreground rounded-2xl px-4 py-2.5',
				!isUser && 'text-foreground',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	)
}

export type MessageAvatarProps = ComponentProps<typeof Avatar> & {
	src: string
	name?: string
}

// Kept for API stability — not rendered by AIChat anymore.
export const MessageAvatar = ({
	className: _ignoredClassName,
	..._ignoredProps
}: MessageAvatarProps) => null

// Type re-export so consumers can still import the avatar component type.
export type { AvatarType }
