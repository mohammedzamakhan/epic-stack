'use client'

import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import { type ComponentProps, useCallback } from 'react'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'

import { cn } from '@repo/ui/cn'

export type ConversationProps = ComponentProps<typeof StickToBottom>

export const Conversation = ({ className, ...props }: ConversationProps) => (
	<StickToBottom
		className={cn('relative flex-1 overflow-y-auto', className)}
		initial="smooth"
		resize="smooth"
		role="log"
		{...props}
	/>
)

export type ConversationContentProps = ComponentProps<
	typeof StickToBottom.Content
>

export const ConversationContent = ({
	className,
	...props
}: ConversationContentProps) => (
	<StickToBottom.Content className={cn('p-4', className)} {...props} />
)

export type ConversationScrollButtonProps = ComponentProps<typeof Button>

export const ConversationScrollButton = ({
	className,
	...props
}: ConversationScrollButtonProps) => {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext()

	const handleScrollToBottom = useCallback(async () => {
		await scrollToBottom()
	}, [scrollToBottom])

	return (
		!isAtBottom && (
			<Button
				className={cn(
					'absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full',
					className,
				)}
				onClick={handleScrollToBottom}
				size="icon"
				type="button"
				variant="outline"
				{...props}
			>
				<Icon name="chevron-down" className="size-4" />
			</Button>
		)
	)
}
