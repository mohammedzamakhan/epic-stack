'use client'

import { useChat, type UIMessage } from '@ai-sdk/react'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { Trans } from '@lingui/react/macro'
import { cn } from '@repo/ui'
import { DefaultChatTransport } from 'ai'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from './ai-elements/conversation.js'
import { Loader } from './ai-elements/loader.js'
import { Message, MessageContent } from './ai-elements/message.js'
import { Response } from './ai-elements/response.js'
import { Suggestions, Suggestion } from './ai-elements/suggestion.js'
import { brand } from '@repo/config/brand'

export interface AIChatProps {
	/**
	 * Optional. When provided, the chat is scoped to that note: the route
	 * handler fetches note context, permissions are enforced, and the
	 * empty-state suggestions target that note. When omitted, the chat
	 * runs as a general (note-less) conversation.
	 */
	noteId?: string
	pageId?: string
	orgSlug?: string
	userName?: string
	greeting?: string
	subtitle?: string
	placeholder?: string
	initialSuggestions?: string[]
	className?: string
	onToolCall?: (options: { toolCall: any }) => any
}

// Message Content Component
function MessageContentRenderer({
	parts,
	isUser,
}: {
	parts: UIMessage['parts']
	isUser: boolean
}) {
	if (isUser) {
		return (
			<div className="leading-relaxed break-words whitespace-pre-wrap">
				{parts.map((part, index) => {
					if (part.type === 'text') {
						return <span key={index}>{part.text}</span>
					}
					return null
				})}
			</div>
		)
	}

	// Use the Response component for AI messages with markdown support
	return (
		<div className="leading-relaxed">
			{parts.map((part, index) => {
				if (part.type === 'text') {
					return <Response key={index}>{part.text}</Response>
				}
				return null
			})}
		</div>
	)
}

// Smart suggestions hook based on context and conversation state
function useSmartSuggestions(messages: UIMessage[], hasContent: boolean) {
	const { _ } = useLingui()

	return useMemo(() => {
		if (messages.length === 0) {
			// Initial suggestions when no conversation has started
			return hasContent
				? [
						_(t`Summarize this note`),
						_(t`What are the key points?`),
						_(t`Suggest improvements`),
						_(t`Create action items`),
						_(t`Find potential issues`),
					]
				: [
						_(t`Help me get started`),
						_(t`What can you help me with?`),
						_(t`Explain this platform`),
						_(t`Show me features`),
					]
		}

		const conversationContext = messages
			.slice(-3)
			.map((m) => {
				const textParts = m.parts.filter((p) => p.type === 'text')
				return textParts.map((p) => (p.type === 'text' ? p.text : '')).join(' ')
			})
			.join(' ')
			.toLowerCase()

		// Context-aware follow-up suggestions
		if (
			conversationContext.includes('summary') ||
			conversationContext.includes('summarize')
		) {
			return [
				_(t`Make it more detailed`),
				_(t`Create bullet points`),
				_(t`What's missing?`),
				_(t`Add next steps`),
			]
		}

		if (
			conversationContext.includes('action') ||
			conversationContext.includes('todo')
		) {
			return [
				_(t`Prioritize these tasks`),
				_(t`Set deadlines`),
				_(t`Assign responsibilities`),
				_(t`Break down complex tasks`),
			]
		}

		if (
			conversationContext.includes('improve') ||
			conversationContext.includes('better')
		) {
			return [
				_(t`Show specific examples`),
				_(t`What tools can help?`),
				_(t`Create a plan`),
				_(t`Identify risks`),
			]
		}

		// General follow-up suggestions
		return [
			_(t`Tell me more`),
			_(t`Give me examples`),
			_(t`What else should I know?`),
			_(t`How can I implement this?`),
		]
	}, [messages, _])
}

// Inline icon set — one stroke weight, one size vocabulary.
function IconPaperclip({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
		</svg>
	)
}

function IconMoreHorizontal({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="5" cy="12" r="1" />
			<circle cx="12" cy="12" r="1" />
			<circle cx="19" cy="12" r="1" />
		</svg>
	)
}

function IconMic({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
			<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
			<line x1="12" x2="12" y1="19" y2="22" />
		</svg>
	)
}

function IconArrowUp({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.25"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="m5 12 7-7 7 7" />
			<path d="M12 19V5" />
		</svg>
	)
}

function IconSquare({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<rect x="6" y="6" width="12" height="12" rx="2.5" />
		</svg>
	)
}

function IconRefresh({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
			<path d="M21 3v5h-5" />
			<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
			<path d="M3 21v-5h5" />
		</svg>
	)
}

// Animated thinking dots — one authored moment.
function ThinkingDots() {
	return (
		<span className="inline-flex items-center gap-1" aria-hidden="true">
			<span className="size-1.5 [animation:ai-dot-pulse_1.2s_ease-in-out_infinite] rounded-full bg-current opacity-60" />
			<span className="size-1.5 [animation:ai-dot-pulse_1.2s_ease-in-out_0.15s_infinite] rounded-full bg-current opacity-60" />
			<span className="size-1.5 [animation:ai-dot-pulse_1.2s_ease-in-out_0.3s_infinite] rounded-full bg-current opacity-60" />
		</span>
	)
}

export function AIChat({
	noteId,
	pageId,
	orgSlug,
	userName = brand.name,
	greeting,
	subtitle,
	placeholder,
	className,
	onToolCall,
}: AIChatProps) {
	const [input, setInput] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)
	const { _ } = useLingui()
	const {
		messages,
		sendMessage,
		status,
		stop: stopGeneration,
		regenerate,
	} = useChat({
		transport: new DefaultChatTransport({
			api: noteId
				? `/api/ai/chat?noteId=${noteId}`
				: pageId
					? `/api/ai/chat?pageId=${pageId}`
					: '/api/ai/chat',
		}),
		onToolCall,
	})

	const smartSuggestions = useSmartSuggestions(messages, Boolean(noteId))
	const [showFollowUpSuggestions, setShowFollowUpSuggestions] = useState(true)

	// Update suggestions visibility based on input
	useEffect(() => {
		setShowFollowUpSuggestions(input.trim().length === 0)
	}, [input])

	// Auto resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto'
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
		}
	}, [input])

	const handleSuggestionClick = (suggestion: string) => {
		setInput(suggestion)
		setShowFollowUpSuggestions(false)
		if (textareaRef.current) {
			textareaRef.current.focus()
			textareaRef.current.style.height = 'auto'
		}
	}

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (input.trim() && status === 'ready') {
			sendMessage({ text: input })
			setInput('')
			setShowFollowUpSuggestions(false)
			if (textareaRef.current) {
				textareaRef.current.style.height = 'auto'
			}
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleFormSubmit(e)
		}
	}

	const isStreaming = status === 'streaming'
	const isSubmitted = status === 'submitted'
	const isBusy = isStreaming || isSubmitted
	const canSend = !isBusy && input.trim().length > 0

	const displayGreeting = greeting || _(t`Hi, it's ${userName}.`)
	const displaySubtitle = subtitle || _(t`Ask me anything.`)
	const inputPlaceholder = placeholder || _(t`What can I help with?`)

	const lastMessage = messages[messages.length - 1]
	const lastIsAssistant = lastMessage?.role === 'assistant'
	const canRegenerate = !isBusy && lastIsAssistant

	return (
		<div
			className={cn(
				'bg-background relative flex h-full flex-col overflow-hidden',
				className,
			)}
		>
			{/* Conversation or Empty State Area */}
			<div className="relative flex flex-1 overflow-hidden">
				{messages.length === 0 ? (
					<div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center select-none">
						{/* Soft emerald halo behind the star. */}
						<div
							className="bg-primary/20 dark:bg-primary/15 pointer-events-none absolute top-1/2 left-1/2 size-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
							aria-hidden="true"
						/>

						{/* 4-point star — the brand mark. */}
						<svg
							viewBox="0 0 64 64"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							className="relative mb-6 size-20 drop-shadow-sm"
							aria-hidden="true"
						>
							<defs>
								<linearGradient
									id="ai-chat-star-gradient"
									x1="0%"
									y1="0%"
									x2="100%"
									y2="100%"
								>
									<stop offset="0%" stopColor="#34d399" />
									<stop offset="55%" stopColor="#10b981" />
									<stop offset="100%" stopColor="#0d9488" />
								</linearGradient>
							</defs>
							<path
								d="M32 4C32 19.464 19.464 32 4 32C19.464 32 32 44.536 32 60C32 44.536 44.536 32 60 32C44.536 32 32 19.464 32 4Z"
								fill="url(#ai-chat-star-gradient)"
							/>
						</svg>

						<h1 className="text-foreground text-lg font-semibold tracking-tight text-balance sm:text-xl">
							{displayGreeting}
						</h1>
						<p className="text-muted-foreground mt-1.5 max-w-sm text-[0.9rem] text-balance">
							{displaySubtitle}
						</p>

						{/* Suggestion pills — soft, centered, floating. */}
						<div className="mt-8 flex w-full max-w-md flex-wrap items-center justify-center gap-2.5">
							{smartSuggestions.map((suggestion, index) => (
								<button
									key={index}
									type="button"
									onClick={() => handleSuggestionClick(suggestion)}
									className={cn(
										'cursor-pointer rounded-full px-4 py-2 text-[0.8125rem] font-medium',
										'bg-muted text-muted-foreground ring-border ring-1',
										'transition-all duration-150 ease-out',
										'hover:bg-accent hover:text-accent-foreground hover:ring-foreground/20',
										'active:scale-[0.97]',
										'focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none',
									)}
								>
									{suggestion}
								</button>
							))}
						</div>
					</div>
				) : (
					<Conversation className="flex-1">
						<ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-6 pb-4 sm:px-6">
							{messages.map((message) => (
								<Message key={message.id} from={message.role}>
									<MessageContent from={message.role}>
										<MessageContentRenderer
											parts={message.parts}
											isUser={message.role === 'user'}
										/>
									</MessageContent>
								</Message>
							))}
							{isBusy && (
								<Message from="assistant">
									<MessageContent>
										<div
											aria-live="polite"
											className="text-muted-foreground flex items-center gap-2 text-sm"
										>
											<Loader size={14} />
											<span className="text-foreground/80">
												<Trans>Thinking</Trans>
											</span>
											<ThinkingDots />
										</div>
									</MessageContent>
								</Message>
							)}
						</ConversationContent>
						<ConversationScrollButton className="border-border/80 bg-background/90 hover:border-primary/40 hover:text-primary shadow-sm backdrop-blur-sm" />
					</Conversation>
				)}
			</div>

			{/* Bottom Input Section */}
			<div className="border-border/70 shrink-0 border-t px-3 pt-3 pb-3 sm:px-4 sm:pb-4">
				<div className="mx-auto w-full max-w-3xl">
					{/* Follow-up suggestions if in active chat */}
					{messages.length > 0 &&
						showFollowUpSuggestions &&
						smartSuggestions.length > 0 && (
							<div className="-mx-1 mb-2.5">
								<Suggestions className="px-1">
									{smartSuggestions.map((suggestion, index) => (
										<Suggestion
											key={index}
											suggestion={suggestion}
											onClick={handleSuggestionClick}
											variant="outline"
											size="sm"
											className={cn(
												'border-border/70 bg-background/70 text-foreground/80 rounded-full text-xs',
												'transition-all duration-150',
												'hover:border-primary/40 hover:bg-primary/5 hover:text-foreground hover:-translate-y-px',
											)}
										/>
									))}
								</Suggestions>
							</div>
						)}

					<form
						onSubmit={handleFormSubmit}
						className={cn(
							'group/form relative flex flex-col',
							isBusy && 'opacity-95',
						)}
					>
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={inputPlaceholder}
							rows={1}
							disabled={isBusy}
							aria-label={inputPlaceholder}
							className={cn(
								'text-foreground w-full resize-none bg-transparent px-1 pt-2 pb-1.5 text-[0.95rem] leading-relaxed',
								'placeholder:text-muted-foreground/70 focus:outline-none',
								'disabled:cursor-not-allowed disabled:opacity-60',
							)}
						/>

						<div className="flex items-center justify-between gap-1 pt-1">
							{/* Left tools: Attach + More */}
							<div className="flex items-center gap-0.5">
								<button
									type="button"
									className={cn(
										'text-muted-foreground cursor-pointer rounded-lg p-2',
										'transition-colors duration-150',
										'hover:bg-muted hover:text-foreground',
										'focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:outline-none',
									)}
									title={_(t`Attach file`)}
									aria-label={_(t`Attach file`)}
								>
									<IconPaperclip className="size-[18px]" />
								</button>
								<button
									type="button"
									className={cn(
										'text-muted-foreground cursor-pointer rounded-lg p-2',
										'transition-colors duration-150',
										'hover:bg-muted hover:text-foreground',
										'focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:outline-none',
									)}
									title={_(t`More options`)}
									aria-label={_(t`More options`)}
								>
									<IconMoreHorizontal className="size-[18px]" />
								</button>
							</div>

							{/* Right tools: regenerate (assistant last) + mic + submit/stop */}
							<div className="flex items-center gap-0.5">
								{canRegenerate && (
									<button
										type="button"
										onClick={() => regenerate()}
										className={cn(
											'text-muted-foreground cursor-pointer rounded-lg p-2',
											'transition-colors duration-150',
											'hover:bg-muted hover:text-foreground',
											'focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:outline-none',
										)}
										title={_(t`Regenerate response`)}
										aria-label={_(t`Regenerate response`)}
									>
										<IconRefresh className="size-[18px]" />
									</button>
								)}
								<button
									type="button"
									className={cn(
										'text-muted-foreground cursor-pointer rounded-lg p-2',
										'transition-colors duration-150',
										'hover:bg-muted hover:text-foreground',
										'focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:outline-none',
									)}
									title={_(t`Voice input`)}
									aria-label={_(t`Voice input`)}
								>
									<IconMic className="size-[18px]" />
								</button>

								<button
									type={isStreaming ? 'button' : 'submit'}
									onClick={isStreaming ? () => stopGeneration() : undefined}
									disabled={!isStreaming && !canSend}
									aria-label={
										isStreaming ? _(t`Stop generation`) : _(t`Send message`)
									}
									className={cn(
										'ml-1 flex size-8 items-center justify-center rounded-full transition-all duration-150 ease-out',
										'focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none',
										isStreaming
											? 'bg-foreground text-background cursor-pointer hover:opacity-90 active:scale-95'
											: canSend
												? 'bg-foreground text-background cursor-pointer hover:opacity-90 active:scale-95'
												: 'bg-muted text-muted-foreground/50 cursor-not-allowed',
									)}
								>
									{isStreaming ? (
										<IconSquare className="size-3" />
									) : isSubmitted ? (
										<Loader size={14} />
									) : (
										<IconArrowUp className="size-4" />
									)}
								</button>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}
