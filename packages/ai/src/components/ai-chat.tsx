'use client'

import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Icon } from '@repo/ui/icon'
import React, { useState, useEffect, useMemo } from 'react'
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from './ai-elements/conversation.js'
import { Loader } from './ai-elements/loader.js'
import {
	Message,
	MessageContent,
	MessageAvatar,
} from './ai-elements/message.js'
import {
	PromptInput,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputSubmit,
} from './ai-elements/prompt-input.js'
import { Response } from './ai-elements/response.js'
import { Suggestions, Suggestion } from './ai-elements/suggestion.js'

interface AIChatProps {
	noteId: string
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
			<div className="whitespace-pre-wrap">
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
		<div>
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
	}, [messages, hasContent, _])
}

export function AIChat({ noteId }: AIChatProps) {
	const [input, setInput] = useState('')
	const { _ } = useLingui()
	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: `/api/ai/chat?noteId=${noteId}`,
		}),
	})

	const smartSuggestions = useSmartSuggestions(messages, true) // Assume note has content
	const [showSuggestions, setShowSuggestions] = useState(true)

	// Update suggestions visibility based on input
	useEffect(() => {
		setShowSuggestions(input.trim().length === 0)
	}, [input])

	const handleSuggestionClick = (suggestion: string) => {
		setInput(suggestion)
		setShowSuggestions(false)
	}

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (input.trim()) {
			sendMessage({ text: input })
			setInput('')
			setShowSuggestions(false)
		}
	}

	const isLoading = status === 'streaming'

	const youLabel = _(t`You`)
	const aiLabel = _(t`AI`)

	return (
		<div className="flex h-full flex-col">
			<Conversation className="flex-1">
				<ConversationContent>
					{messages.length === 0 ? (
						<div className="mt-10 flex h-full flex-col items-center justify-center space-y-4 text-center">
							<div className="text-muted-foreground flex items-center gap-2">
								<Icon name="sparkles" className="h-5 w-5" />
								<p>
									<Trans>AI Assistant ready to help with this note</Trans>
								</p>
							</div>
							<div className="text-muted-foreground max-w-md text-sm">
								<Trans>
									Ask questions, request summaries, get suggestions, or discuss
									the content of this note.
								</Trans>
							</div>
						</div>
					) : (
						messages.map((message) => (
							<Message key={message.id} from={message.role}>
								<MessageContent>
									<MessageContentRenderer
										parts={message.parts}
										isUser={message.role === 'user'}
									/>
								</MessageContent>
								<MessageAvatar
									src={
										message.role === 'user'
											? '/default-avatar.png'
											: '/ai-avatar.png'
									}
									name={message.role === 'user' ? youLabel : aiLabel}
								/>
							</Message>
						))
					)}
					{isLoading && (
						<Message from="assistant">
							<MessageContent>
								<div aria-live="polite" className="flex items-center gap-2">
									<Loader size={16} />
									<span className="text-sm">
										<Trans>AI is thinking...</Trans>
									</span>
								</div>
							</MessageContent>
							<MessageAvatar src="/ai-avatar.png" name={aiLabel} />
						</Message>
					)}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div className="border-t">
				{/* Smart Suggestions */}
				{showSuggestions && smartSuggestions.length > 0 && (
					<div className="p-4 pb-2">
						<div className="mb-2 flex items-center gap-2">
							<Icon name="sparkles" className="text-muted-foreground h-4 w-4" />
							<span className="text-muted-foreground text-sm font-medium">
								<Trans>Suggested questions</Trans>
							</span>
						</div>
						<Suggestions>
							{smartSuggestions.map((suggestion, index) => (
								<Suggestion
									key={index}
									suggestion={suggestion}
									onClick={handleSuggestionClick}
									variant="outline"
									size="sm"
									className="text-xs"
								/>
							))}
						</Suggestions>
					</div>
				)}

				{/* Input Form */}
				<div className="p-4 pt-2">
					<PromptInput onSubmit={handleFormSubmit}>
						<PromptInputTextarea
							value={input}
							onChange={(e) => {
								setInput(e.target.value)
								setShowSuggestions(e.target.value.trim().length === 0)
							}}
							placeholder={_(t`Ask about this note...`)}
							disabled={isLoading}
							onFocus={() => setShowSuggestions(input.trim().length === 0)}
						/>
						<PromptInputToolbar>
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground px-4 text-xs">
									<Trans>Press Enter to send, Shift+Enter for new line</Trans>
								</span>
								{input.length > 0 && (
									<span className="text-muted-foreground text-xs">
										<Trans>{input.length} characters</Trans>
									</span>
								)}
							</div>
							<PromptInputSubmit
								status={isLoading ? 'streaming' : 'idle'}
								disabled={isLoading || !input.trim()}
							/>
						</PromptInputToolbar>
					</PromptInput>
				</div>
			</div>
		</div>
	)
}
