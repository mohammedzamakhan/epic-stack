'use client'

import { Trans, useLingui } from '@lingui/react/macro'
import { useIsMobile } from '@repo/ui'
import { Button } from '@repo/ui/button'
import { Icon } from '@repo/ui/icon'
import {
	Component,
	lazy,
	Suspense,
	useCallback,
	useEffect,
	type ErrorInfo,
	type ReactNode,
} from 'react'
import { useFetcher, useNavigate, useParams } from 'react-router'
import { useAIPanel } from './ai-panel-context'

// Lazy-load the AIChat component (and the heavy @repo/ai dependency tree)
// so the dashboard never pays the cost until the panel is first opened.
const AIChat = lazy(() =>
	import('@repo/ai').then((module) => ({ default: module.AIChat })),
)

class PanelErrorBoundary extends Component<
	{ children: ReactNode; fallback: ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: ReactNode; fallback: ReactNode }) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('GlobalAIChat failed to load:', error, info)
	}

	render() {
		if (this.state.hasError) return this.props.fallback
		return this.props.children
	}
}

function LoadingShell() {
	return (
		<div className="text-muted-foreground flex h-full items-center justify-center text-sm">
			<Trans>Loading assistant…</Trans>
		</div>
	)
}

function ErrorShell({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm">
			<p className="text-muted-foreground">
				<Trans>Couldn't load the assistant.</Trans>
			</p>
			<Button variant="outline" size="sm" onClick={onRetry}>
				<Trans>Try again</Trans>
			</Button>
		</div>
	)
}

function CloseButton() {
	const { close } = useAIPanel()
	const { i18n } = useLingui()
	return (
		<Button
			variant="ghost"
			size="icon-sm"
			type="button"
			onClick={(e) => {
				e.stopPropagation()
				close()
			}}
			aria-label={i18n._('Close assistant')}
		>
			<Icon name="x" className="size-4" />
		</Button>
	)
}

function getToolInput(toolCall: { input?: unknown; args?: unknown }) {
	const raw = toolCall.input ?? toolCall.args
	if (raw && typeof raw === 'object') {
		return raw as Record<string, unknown>
	}
	return {}
}

function asString(value: unknown) {
	if (typeof value === 'string') return value
	if (typeof value === 'number') return String(value)
	if (value == null) return ''
	return JSON.stringify(value)
}

function PanelBody() {
	const params = useParams()
	const fetcher = useFetcher()
	const navigate = useNavigate()
	const pageId = params.pageId
	const orgSlug = params.orgSlug

	const openPageEditor = useCallback(
		(targetPageId: string) => {
			if (!orgSlug) return
			if (targetPageId === pageId) return
			void navigate(`/${orgSlug}/website/pages/${targetPageId}`)
		},
		[navigate, orgSlug, pageId],
	)

	const handleToolCall = useCallback(
		async ({ toolCall }: { toolCall: any }) => {
			if (!orgSlug) return 'Error: Not in an organization'

			const input = getToolInput(toolCall)
			const targetPageId = asString(input.pageId) || pageId

			if (toolCall.toolName === 'navigateToPage') {
				if (!targetPageId) return 'Error: Missing pageId'
				openPageEditor(targetPageId)
				return `Opened the page editor for ${targetPageId}`
			}

			if (!targetPageId) {
				return 'Error: Missing pageId. Navigate to a page editor or pass pageId.'
			}

			// Open the target page editor first so the user can see the change,
			// even when the request started from the dashboard or another page.
			openPageEditor(targetPageId)

			const action = `/${orgSlug}/website/pages/${targetPageId}`

			if (toolCall.toolName === 'addSection') {
				void fetcher.submit(
					{
						intent: 'add-section',
						type: asString(input.type),
						position: asString(input.position),
					},
					{
						method: 'POST',
						action,
					},
				)
				return 'Section added successfully'
			}

			if (toolCall.toolName === 'updateSection') {
				void fetcher.submit(
					{
						intent: 'update-section',
						sectionId: asString(input.sectionId),
						config: asString(input.config),
					},
					{
						method: 'POST',
						action,
					},
				)
				return 'Section updated successfully'
			}

			if (toolCall.toolName === 'removeSection') {
				void fetcher.submit(
					{
						intent: 'remove-section',
						sectionId: asString(input.sectionId),
					},
					{
						method: 'POST',
						action,
					},
				)
				return 'Section removed successfully'
			}

			return 'Unknown tool'
		},
		[fetcher, openPageEditor, orgSlug, pageId],
	)

	return (
		<>
			<div className="border-border/70 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
				<div className="flex items-center gap-2">
					<span
						className="bg-primary/15 text-primary flex size-6 items-center justify-center rounded-md"
						aria-hidden="true"
					>
						<Icon name="sparkles" className="size-3.5" />
					</span>
					<span className="text-sm font-medium tracking-tight">
						<Trans>Assistant</Trans>
					</span>
				</div>
				<CloseButton />
			</div>

			<div className="min-h-0 flex-1">
				<PanelErrorBoundary
					fallback={<ErrorShell onRetry={() => window.location.reload()} />}
				>
					<Suspense fallback={<LoadingShell />}>
						<AIChat
							pageId={pageId}
							orgSlug={orgSlug}
							onToolCall={handleToolCall}
						/>
					</Suspense>
				</PanelErrorBoundary>
			</div>
		</>
	)
}

function MobilePanel() {
	const { isOpen, close } = useAIPanel()
	const { i18n } = useLingui()

	useEffect(() => {
		if (!isOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [isOpen, close])

	// Lock body scroll while open.
	useEffect(() => {
		if (!isOpen) return
		const previous = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = previous
		}
	}, [isOpen])

	if (!isOpen) return null

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={i18n._('AI assistant')}
			className="bg-background fixed inset-0 z-50 flex flex-col"
		>
			<PanelBody />
		</div>
	)
}

function DesktopPanel() {
	const { isOpen, close } = useAIPanel()
	const { i18n } = useLingui()

	useEffect(() => {
		if (!isOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [isOpen, close])

	// Animate the outer aside's width. Inner content keeps a fixed 420px
	// surface so the chat doesn't reflow as the column collapses.
	return (
		<aside
			aria-label={i18n._('AI assistant')}
			aria-hidden={!isOpen}
			className={[
				'sticky top-2 m-2 ml-0 h-[calc(100svh-1rem)] shrink-0 self-start',
				'border-border/70 bg-background overflow-hidden rounded-xl border shadow-sm',
				'transition-[width,opacity] duration-300 ease-out',
				isOpen
					? 'w-[420px] opacity-100'
					: 'pointer-events-none w-0 border-0 opacity-0 shadow-none',
			].join(' ')}
		>
			<div className="flex h-full w-[420px] flex-col">
				{isOpen ? <PanelBody /> : null}
			</div>
		</aside>
	)
}

export function GlobalAIChat() {
	const isMobile = useIsMobile()
	// Avoid SSR hydration mismatch: render nothing until the media query
	// resolves on the client.
	if (isMobile === undefined) return null
	return isMobile ? <MobilePanel /> : <DesktopPanel />
}

export function GlobalAIToggle() {
	const { isOpen, toggle } = useAIPanel()
	return (
		<Button
			variant={isOpen ? 'secondary' : 'outline'}
			type="button"
			onClick={toggle}
			aria-pressed={isOpen}
			aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
			className="h-8 gap-1.5 rounded-lg px-2.5 text-sm font-normal"
		>
			<Icon name="sparkles" className="size-4" />
			<span className="hidden md:inline">
				<Trans>Ask AI</Trans>
			</span>
		</Button>
	)
}
