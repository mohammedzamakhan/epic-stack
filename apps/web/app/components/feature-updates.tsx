import { motion, AnimatePresence } from 'framer-motion'
import { X, Play } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '#app/utils/misc'

interface FeatureUpdate {
	id: string
	title: string
	description: string
	image?: string
	videoUrl?: string
	learnMoreUrl?: string
	type: 'feature' | 'announcement' | 'tip'
}

interface FeatureUpdatesProps {
	className?: string
	onVisibilityChange?: (hasVisibleUpdates: boolean) => void
}

// Hardcoded updates for now
const FEATURE_UPDATES: FeatureUpdate[] = [
	{
		id: 'note-templates',
		title: 'Note Templates',
		description:
			'Create consistent notes faster with customizable templates for meetings, projects, and more',
		type: 'feature',
	},
	{
		id: 'smart-search',
		title: 'AI-Powered Search',
		description: '',
		image: '/images/smart-search.jpg',
		videoUrl: '#',
		learnMoreUrl: '#',
		type: 'feature',
	},
	{
		id: 'real-time-collaboration',
		title: 'Real-time Editing',
		description:
			'Collaborate on notes in real-time with your team members and see changes instantly',
		type: 'feature',
	},
]

export function FeatureUpdates({
	className,
	onVisibilityChange,
}: FeatureUpdatesProps) {
	const [dismissedUpdates, setDismissedUpdates] = useState<Set<string>>(
		new Set(),
	)

	const visibleUpdates = FEATURE_UPDATES.filter(
		(update) => !dismissedUpdates.has(update.id),
	)

	const handleDismiss = (updateId: string) => {
		setDismissedUpdates((prev) => new Set([...prev, updateId]))
	}

	useEffect(() => {
		onVisibilityChange?.(visibleUpdates.length > 0)
	}, [visibleUpdates.length, onVisibilityChange])

	const currentUpdate = visibleUpdates[0]
	const stackCount = visibleUpdates.length

	return (
		<AnimatePresence mode="wait">
			{visibleUpdates.length > 0 && currentUpdate && (
				<motion.div
					className={cn('relative px-2 py-3', className)}
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: -20, scale: 0.95 }}
					transition={{
						duration: 0.4,
						ease: [0.25, 0.46, 0.45, 0.94],
						layout: { duration: 0.3 },
					}}
					layout
				>
					<div className="relative">
						{/* Stack effect - render cards behind the main one */}
						<AnimatePresence>
							{stackCount > 1 && (
								<>
									{stackCount > 2 && (
										<motion.div
											initial={{ opacity: 0, scale: 0.8, y: -10 }}
											animate={{ opacity: 0.5, scale: 0.85, y: -24 }}
											exit={{ opacity: 0, scale: 0.8, y: -10 }}
											transition={{ duration: 0.3, ease: 'easeOut' }}
											className="border-sidebar-border/60 absolute inset-0 rounded-md border bg-gray-800"
											style={{
												boxShadow:
													'0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03)',
												filter: 'blur(0.25px)',
											}}
										/>
									)}
									<motion.div
										initial={{ opacity: 0, scale: 0.88, y: -5 }}
										animate={{ opacity: 0.7, scale: 0.92, y: -12 }}
										exit={{ opacity: 0, scale: 0.88, y: -5 }}
										transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
										className="border-sidebar-border/60 absolute inset-0 rounded-md border bg-gray-700"
										style={{
											boxShadow:
												'0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.03)',
											filter: 'blur(0.25px)',
										}}
									/>
								</>
							)}
						</AnimatePresence>

						{/* Main card */}
						<motion.div
							key={currentUpdate.id}
							initial={{ opacity: 0, scale: 0.9, y: 10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, x: -100 }}
							transition={{
								duration: 0.4,
								ease: [0.25, 0.46, 0.45, 0.94],
								exit: { duration: 0.3, ease: 'easeIn' },
							}}
							className="bg-sidebar-accent border-sidebar-border relative z-20 flex flex-col justify-between rounded-md border p-3"
							style={{
								boxShadow:
									'0 30px 60px -12px rgba(0, 0, 0, 0.7), 0 8px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
							}}
							whileHover={{
								scale: 1.02,
								transition: { duration: 0.2 },
							}}
						>
							{/* Dismiss button */}
							<motion.button
								onClick={() => handleDismiss(currentUpdate.id)}
								className="hover:bg-sidebar-primary/10 absolute top-2 right-2 rounded-full p-0.5 transition-colors"
								aria-label="Dismiss"
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.95 }}
								transition={{ duration: 0.15 }}
							>
								<X className="text-sidebar-foreground/60 hover:text-sidebar-foreground h-3.5 w-3.5" />
							</motion.button>

							{/* Content */}
							<div>
								<motion.div
									className="pr-6"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, delay: 0.1 }}
								>
									<h5 className="text-sidebar-foreground line-clamp-1 text-sm leading-5 font-bold">
										{currentUpdate.title}
									</h5>
									<p className="text-sidebar-foreground/70 line-clamp-2 pt-1 text-xs">
										{currentUpdate.description}
									</p>
								</motion.div>

								{/* Media placeholder */}
								{currentUpdate.image && (
									<motion.div
										className="group relative my-3 flex aspect-video items-center overflow-hidden rounded"
										initial={{ opacity: 0, scale: 0.95 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ duration: 0.4, delay: 0.15 }}
									>
										<div className="bg-sidebar/50 group-hover:bg-sidebar/40 absolute inset-0 transition" />
										{currentUpdate.videoUrl && (
											<motion.button
												className="group absolute inset-0 flex items-center justify-center"
												whileHover={{ scale: 1.05 }}
												whileTap={{ scale: 0.95 }}
											>
												<div className="bg-sidebar-foreground rounded-full p-2 shadow-lg transition-all hover:-mt-px">
													<Play className="text-sidebar ml-0.5 h-4 w-4" />
												</div>
											</motion.button>
										)}
										<div className="bg-sidebar/20 flex h-full w-full items-center justify-center">
											<span className="text-sidebar-foreground/50 text-xs font-medium">
												Feature Preview
											</span>
										</div>
									</motion.div>
								)}

								{/* Actions */}
								<motion.div
									className="mt-2 flex items-center"
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, delay: 0.2 }}
								>
									{currentUpdate.learnMoreUrl && (
										<motion.button
											className="hover:text-sidebar-primary/80 text-xs font-medium text-blue-500 transition-colors"
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
										>
											Learn more
										</motion.button>
									)}
									<motion.button
										onClick={() => handleDismiss(currentUpdate.id)}
										className="text-sidebar-foreground/60 hover:text-sidebar-foreground ml-auto p-0 text-xs font-normal transition-colors"
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
									>
										Dismiss
									</motion.button>
								</motion.div>
							</div>
						</motion.div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
