'use client'

import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Icon } from '@repo/ui/icon'
import React, { useState, useEffect } from 'react'
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

// Smart suggestions based on context and conversation state
const getSmartSuggestions = (messages: UIMessage[], hasContent: boolean) => {
	if (messages.length === 0) {
		// Initial suggestions when no conversation has started
		return hasContent
			? [
					'Summarize this note',
					'What are the key points?',
					'Suggest improvements',
					'Create action items',
					'Find potential issues',
				]
			: [
					'Help me get started',
					'What can you help me with?',
					'Explain this platform',
					'Show me features',
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
			'Make it more detailed',
			'Create bullet points',
			"What's missing?",
			'Add next steps',
		]
	}

	if (
		conversationContext.includes('action') ||
		conversationContext.includes('todo')
	) {
		return [
			'Prioritize these tasks',
			'Set deadlines',
			'Assign responsibilities',
			'Break down complex tasks',
		]
	}

	if (
		conversationContext.includes('improve') ||
		conversationContext.includes('better')
	) {
		return [
			'Show specific examples',
			'What tools can help?',
			'Create a plan',
			'Identify risks',
		]
	}

	// General follow-up suggestions
	return [
		'Tell me more',
		'Give me examples',
		'What else should I know?',
		'How can I implement this?',
	]
}

export function AIChat({ noteId }: AIChatProps) {
	const [input, setInput] = useState('')
	const { messages, sendMessage, status } = useChat({
		transport: new DefaultChatTransport({
			api: `/api/ai/chat?noteId=${noteId}`,
		}),
	})

	const [suggestions, setSuggestions] = useState<string[]>([])
	const [showSuggestions, setShowSuggestions] = useState(true)

	// Update suggestions based on conversation state
	useEffect(() => {
		const newSuggestions = getSmartSuggestions(messages, true) // Assume note has content
		setSuggestions(newSuggestions)
		setShowSuggestions(input.trim().length === 0) // Hide suggestions when user is typing
	}, [messages, input])

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

	return (
		<div className="flex h-full flex-col">
			<Conversation className="flex-1">
				<ConversationContent>
					{messages.length === 0 ? (
						<div className="mt-10 flex h-full flex-col items-center justify-center space-y-4 text-center">
							<div className="text-muted-foreground flex items-center gap-2">
								<Icon name="sparkles" className="h-5 w-5" />
								<p>AI Assistant ready to help with this note</p>
							</div>
							<div className="text-muted-foreground max-w-md text-sm">
								Ask questions, request summaries, get suggestions, or discuss
								the content of this note.
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
									name={message.role === 'user' ? 'You' : 'AI'}
								/>
							</Message>
						))
					)}
					{isLoading && (
						<Message from="assistant">
							<MessageContent>
								<div aria-live="polite" className="flex items-center gap-2">
									<Loader size={16} />
									<span className="text-sm">AI is thinking...</span>
								</div>
							</MessageContent>
							<MessageAvatar src="/ai-avatar.png" name="AI" />
						</Message>
					)}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div className="border-t">
				{/* Smart Suggestions */}
				{showSuggestions && suggestions.length > 0 && (
					<div className="p-4 pb-2">
						<div className="mb-2 flex items-center gap-2">
							<Icon name="sparkles" className="text-muted-foreground h-4 w-4" />
							<span className="text-muted-foreground text-sm font-medium">
								Suggested questions
							</span>
						</div>
						<Suggestions>
							{suggestions.map((suggestion, index) => (
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
							placeholder="Ask about this note..."
							disabled={isLoading}
							onFocus={() => setShowSuggestions(input.trim().length === 0)}
						/>
						<PromptInputToolbar>
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground px-4 text-xs">
									Press Enter to send, Shift+Enter for new line
								</span>
								{input.length > 0 && (
									<span className="text-muted-foreground text-xs">
										{input.length} characters
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
