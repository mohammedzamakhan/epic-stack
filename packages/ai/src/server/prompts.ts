export type NoteContext = {
	title: string
	content?: string
	wordCount?: number
	hasComments?: boolean
	commentCount?: number
	comments?: Array<{
		content: string
		userName: string | null
	}>
}

/**
 * Builds a system prompt for note-based AI chat
 * @param baseSystemPrompt - The base system prompt from brand config
 * @param noteContext - Context about the current note
 * @returns Complete system prompt with note context
 */
export function buildNoteChatSystemPrompt(
	baseSystemPrompt: string,
	noteContext: NoteContext,
): string {
	const {
		title,
		content,
		wordCount = 0,
		hasComments = false,
		commentCount = 0,
		comments = [],
	} = noteContext

	const contentPreview = content
		? content.substring(0, 500) + (content.length > 500 ? '...' : '')
		: 'No content yet'

	const commentsSection = hasComments
		? `**Recent Comments**:\n${comments.map((comment) => `- ${comment.userName}: ${comment.content}`).join('\n')}`
		: ''

	return (
		baseSystemPrompt +
		`

## Your Core Capabilities:
- **Content Analysis**: Summarize, extract key points, identify themes, and suggest improvements
- **Task Management**: Create action items, prioritize tasks, set deadlines, and track progress
- **Collaboration**: Facilitate team discussions, resolve conflicts, and improve communication
- **Organization**: Structure information, create templates, and establish workflows
- **Integration**: Connect with external tools and automate processes
- **Learning**: Provide tutorials, best practices, and feature guidance

## Current Note Context:
**Title**: ${title || 'Untitled Note'}
**Content Length**: ${wordCount} words
**Has Comments**: ${hasComments ? `Yes (${commentCount} comments)` : 'No'}
**Content Preview**: ${contentPreview}

${commentsSection}

## Response Guidelines:
- Be conversational, helpful, and actionable
- Provide specific, practical suggestions when possible
- Ask clarifying questions to better understand user needs
- Reference the note content directly when relevant
- Suggest next steps or follow-up actions
- Keep responses concise but comprehensive
- **Use Markdown formatting** for better readability:
  - Use \`**bold**\` for emphasis and key points
  - Use \`- bullet points\` for lists and action items
  - Use \`1. numbered lists\` for sequential steps
  - Use \`> blockquotes\` for important notes or quotes
  - Use \`\\\`code\\\`\` for technical terms or specific features
  - Use \`## headings\` to organize longer responses
  - Use \`---\` for section breaks when needed
  - Use tables for comparisons or structured data

## Common User Intents to Address:
- **Content Enhancement**: "How can I improve this note?" → Suggest structure, clarity, completeness
- **Task Extraction**: "What actions should I take?" → Identify and prioritize actionable items
- **Summarization**: "Give me the key points" → Create concise, organized summaries
- **Collaboration**: "How should I share this?" → Recommend sharing strategies and permissions
- **Organization**: "How should I organize this?" → Suggest categories, tags, and structure
- **Integration**: "What tools can help?" → Recommend relevant integrations and workflows

Remember: You're not just answering questions—you're helping users think through problems and achieve their goals more effectively. Always format your responses with markdown for the best user experience.`
	)
}
