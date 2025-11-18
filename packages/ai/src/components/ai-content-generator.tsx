import { useState } from 'react'
import { useFetcher } from 'react-router'

import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'

interface AIContentGeneratorProps {
	title: string
	onContentGenerated: (content: string) => void
	disabled?: boolean
}

export function AIContentGenerator({
	title,
	onContentGenerated,
	disabled = false,
}: AIContentGeneratorProps) {
	const [isGenerating, setIsGenerating] = useState(false)
	const fetcher = useFetcher()

	const handleGenerate = async () => {
		if (!title.trim() || disabled) return

		setIsGenerating(true)

		try {
			void fetcher.submit(
				{ title, intent: 'generate-content' },
				{ method: 'POST', action: '/api/ai/generate-content' },
			)
		} catch (error) {
			console.error('Failed to generate content:', error)
			setIsGenerating(false)
		}
	}

	// Handle fetcher response
	if (fetcher.data && fetcher.state === 'idle' && isGenerating) {
		setIsGenerating(false)
		if (fetcher.data.success && fetcher.data.content) {
			onContentGenerated(fetcher.data.content)
		}
	}

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={handleGenerate}
			disabled={!title.trim() || disabled || isGenerating}
			className="flex items-center gap-2"
		>
			<Icon name="sparkles" className="h-4 w-4" />
			{isGenerating ? 'Generating...' : 'Generate with AI'}
		</Button>
	)
}
