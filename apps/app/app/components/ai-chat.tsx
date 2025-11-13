'use client'

import { useChat, type Message as AIMessage } from 'ai/react'
import { SparklesIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from '#app/components/ai-elements/conversation.tsx'
import { Loader } from '#app/components/ai-elements/loader.tsx'
import {
	Message,
	MessageContent,
	MessageAvatar,
} from '#app/components/ai-elements/message.tsx'
import {
	PromptInput,
	PromptInputTextarea,
	PromptInputToolbar,
	PromptInputSubmit,
} from '#app/components/ai-elements/prompt-input.tsx'
import { Response } from '#app/components/ai-elements/response.tsx'
import { Suggestions, Suggestion } from '#app/components/ai-elements/suggestion.tsx'
import { ClientOnly } from 'remix-utils/client-only'

interface AIChatProps {
	noteId: string
}

// Message Content Component
function MessageContentRenderer({
	content,
	isUser,
}: {
	content: string
	isUser: boolean
}) {
	if (isUser) {
		return <div className="whitespace-pre-wrap">{content}</div>
	}

	// Use the Response component for AI messages with markdown support
	return <Response>{content}</Response>
}

// Smart suggestions based on context and conversation state
const getSmartSuggestions = (messages: AIMessage[], hasContent: boolean) => {
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

	const lastMessage = messages[messages.length - 1]
	const conversationContext = messages
		.slice(-3)
		.map((m) => m.content.toLowerCase())
		.join(' ')

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
	const { messages, input, handleInputChange, handleSubmit, isLoading } =
		useChat({
			api: `/api/ai/chat?noteId=${noteId}`,
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
		handleInputChange({ target: { value: suggestion } } as any)
		setShowSuggestions(false)
	}

	const handleFormSubmit = (e: React.FormEvent) => {
		handleSubmit(e)
		setShowSuggestions(false)
	}

	return (
		<div className="flex h-full flex-col">
			<Conversation className="flex-1">
				<ConversationContent>
					{messages.length === 0 ? (
						<div className="mt-10 flex h-full flex-col items-center justify-center space-y-4 text-center">
							<div className="text-muted-foreground flex items-center gap-2">
								<SparklesIcon className="h-5 w-5" />
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
										content={message.content}
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
								<div className="flex items-center gap-2">
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
							<SparklesIcon className="text-muted-foreground h-4 w-4" />
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
								handleInputChange(e)
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
