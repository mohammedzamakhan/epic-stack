import React, { useRef } from 'react'
import { Link, useFetcher } from 'react-router'
import { type OnboardingProgressData } from '#app/utils/onboarding'
import { ListTodoIcon, type ListTodoIconHandle } from './icons/list-todo'
import { ShineBorder } from './magic-ui/shine-border'

import {
	Button,
	Card,
	CardHeader,
	CardHeaderContent,
	CardAction,
	CardContent,
	Progress,
	Icon,
} from '@repo/ui'

interface OnboardingChecklistProps {
	progress: OnboardingProgressData
	orgSlug: string
	organizationId: string
	variant?: 'sidebar' | 'dashboard'
	className?: string
}

export function OnboardingChecklist({
	progress,
	orgSlug,
	organizationId,
	variant = 'dashboard',
	className = '',
}: OnboardingChecklistProps) {
	const fetcher = useFetcher()
	const listTodoIconRef = useRef<ListTodoIconHandle>(null)

	// Don't show if completed and not visible
	if (progress.isCompleted && !progress.isVisible) {
		return null
	}

	const progressPercentage =
		(progress.completedCount / progress.totalSteps) * 100

	const handleStepAction = (step: any) => {
		if (!step.actionConfig) return

		switch (step.actionConfig.type) {
			case 'navigate':
				// Navigation will be handled by the Link component
				// Don't auto-complete navigation steps - let auto-detection handle it
				break
			case 'modal':
				// Handle modal opening
				if (step.actionConfig.target === 'command-menu') {
					// Trigger command menu and mark as completed since it's hard to auto-detect
					const event = new KeyboardEvent('keydown', {
						key: 'k',
						metaKey: true,
						ctrlKey: true,
					})
					document.dispatchEvent(event)
				}
				break
			case 'external':
				window.open(step.actionConfig.target, '_blank')
				break
		}
	}

	const handleHide = () => {
		void fetcher.submit(
			{ organizationId },
			{ method: 'POST', action: `/api/onboarding/hide` },
		)
	}

	if (variant === 'sidebar') {
		return (
			<div
				className={`group relative overflow-hidden rounded-lg border border-slate-600/50 bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-slate-800/20 px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:border-slate-500/60 hover:shadow-lg hover:shadow-blue-500/10 ${className}`}
				onMouseEnter={() => listTodoIconRef.current?.startAnimation()}
				onMouseLeave={() => listTodoIconRef.current?.stopAnimation()}
			>
				<ShineBorder shineColor={['#A07CFE', '#FE8FB5', '#FFBE7B']} />
				{/* Subtle background pattern with hover animation */}
				<div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent opacity-40 transition-all duration-500 group-hover:via-blue-400/8 group-hover:opacity-60" />
				<div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-300/0 to-blue-400/0 opacity-0 transition-all duration-700 group-hover:via-blue-300/3 group-hover:opacity-100" />

				<div className="relative z-10">
					<div className="mb-3 flex w-full items-center justify-between">
						<div className="flex items-center gap-2">
							<ListTodoIcon
								ref={listTodoIconRef}
								size={16}
								className="text-blue-400"
							/>
							<span className="text-sm font-semibold text-white">
								Get Started
							</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="rounded border border-slate-600/50 bg-slate-700/80 px-1.5 py-0.5 text-xs font-medium text-white">
								{progress.completedCount}/{progress.totalSteps}
							</span>
						</div>
					</div>

					<div className="space-y-2">
						<Progress
							value={progressPercentage}
							className="border-muted-foreground h-2.5 border shadow-inner"
						/>
						<div className="flex items-center justify-between">
							<span className="text-xs font-medium text-slate-200">
								{Math.round(progressPercentage)}% complete
							</span>
							{progressPercentage === 100 && (
								<div className="flex items-center gap-1 rounded-full border border-green-500/50 bg-green-600/80 px-2 py-0.5 text-xs font-medium text-white">
									<Icon name="check" className="h-3 w-3" />
									Done!
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<Card className={className}>
			<CardHeader className="grid grid-cols-[1fr_auto] items-start">
				<CardHeaderContent>
					<h3 className="text-lg font-semibold">Get Started</h3>
					<p className="text-muted-foreground text-sm">
						{progress.completedCount} of {progress.totalSteps} completed
					</p>
				</CardHeaderContent>
				<CardAction className="flex items-center gap-3">
					<div className="text-right">
						<div className="text-sm font-medium">
							{Math.round(progressPercentage)}%
						</div>
						<div className="text-muted-foreground text-xs">complete</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleHide}
						className="h-8 w-8 shrink-0 p-0"
					>
						<Icon name="x" className="h-4 w-4" />
					</Button>
				</CardAction>
			</CardHeader>

			<CardContent className="space-y-6 p-2">
				<div className="space-y-1">
					{progress.steps.map((step, index) => (
						<div
							key={step.id}
							className={`group hover:bg-muted/50 flex items-center gap-4 rounded-lg p-2 transition-colors ${
								index > 0 ? 'border-border/50 border-t' : ''
							}`}
						>
							<div className="flex-shrink-0">
								{step.isCompleted ? (
									<div className="flex h-8 w-8 items-center justify-center rounded-full bg-black ring-2 ring-black/10">
										<Icon name="check" className="h-4 w-4 text-white" />
									</div>
								) : (
									<div className="border-muted-foreground/30 bg-background flex h-8 w-8 items-center justify-center rounded-full border-2">
										<Icon
											name={(step.icon as any) || 'check-circle'}
											className="text-muted-foreground h-4 w-4"
										/>
									</div>
								)}
							</div>

							<div className="min-w-0 flex-1">
								<h4
									className={`text-sm font-medium ${
										step.isCompleted
											? 'text-muted-foreground line-through'
											: 'text-foreground'
									}`}
								>
									{step.title}
								</h4>
								<p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
									{step.description}
								</p>
							</div>

							<div className="flex-shrink-0">
								{step.isCompleted ? (
									<span className="text-muted-foreground text-sm font-medium">
										{step.actionConfig?.completedLabel || 'Completed'}
									</span>
								) : (
									step.actionConfig && (
										<div>
											{step.actionConfig.type === 'navigate' ? (
												<Link
													to={`/app/${orgSlug}${step.actionConfig.target}`}
													onClick={() => handleStepAction(step)}
												>
													<Button
														variant="outline"
														size="sm"
														className="shadow-sm"
													>
														{step.actionConfig.label}
														<Icon name="arrow-right" className="ml-2 h-3 w-3" />
													</Button>
												</Link>
											) : (
												<Button
													size="sm"
													className="bg-black text-white shadow-sm hover:bg-black/90"
													onClick={() => handleStepAction(step)}
												>
													{step.actionConfig.label}
													<Icon name="arrow-right" className="ml-2 h-3 w-3" />
												</Button>
											)}
										</div>
									)
								)}
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
