import React, { useEffect, useState } from 'react'
import { useNotifications, useNovu } from '@novu/react/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover'
import { Badge } from '../ui/badge'
import { Notification } from '@novu/js'
import Markdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/tooltip'
import { Icon } from './icon'

interface Action {
	label: string
	isCompleted: boolean
	redirect?: Redirect
}

interface Redirect {
	url: string
	target?: '_self' | '_blank' | '_parent' | '_top' | '_unfencedTop'
}

function formatRelativeTime(timestamp: string): string {
	const date = new Date(timestamp)
	const now = new Date()
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

	if (diffInSeconds < 60) return `${diffInSeconds}s ago`
	if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
	if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
	if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

	return date.toLocaleDateString()
}

function NotificationItem({ notification }: { notification: Notification }) {
	const [isHovered, setIsHovered] = useState(false)

	const handleRedirect = (redirect?: Redirect) => {
		if (redirect?.url) {
			window.open(redirect.url, redirect.target || '_self')
		}
	}

	const handlePress = async () => {
		if (!notification.isRead) {
			try {
				// Implement read functionality here
				await notification.read()
			} catch (error) {
				console.error('Error marking notification as read:', error)
			}
		}
		handleRedirect(notification.redirect)
	}

	const handleMarkAsReadUnread = async (e: React.MouseEvent) => {
		e.stopPropagation()
		try {
			if (notification.isRead) {
				await notification.unread()
			} else {
				await notification.read()
			}
		} catch (error) {
			console.error('Error toggling read status:', error)
		}
	}

	const renderAction = (action: Action, isPrimary: boolean) => {
		const isDisabled = action.isCompleted
		return (
			<Button
				variant={isPrimary ? 'default' : 'outline'}
				size="xs"
				className={`${isDisabled ? 'cursor-not-allowed opacity-50' : ''} ${action.isCompleted ? 'bg-primary hover:bg-primary/90' : ''}`}
				onClick={() => handleRedirect(action.redirect)}
				disabled={isDisabled}
			>
				{action.label}
				{action.isCompleted && <Icon name="check" className="ml-2 h-4 w-4" />}
			</Button>
		)
	}

	return (
		<Card
			className={`${notification.isRead ? 'bg-background' : 'bg-accent'}`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={handlePress}
		>
			<CardContent className="flex items-start p-4">
				<Avatar className="mr-2 h-8 w-8">
					<AvatarImage src={notification.avatar} alt="Avatar" />
					<AvatarFallback>{notification.subject?.[0] || 'N'}</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<div className="mb-1 flex items-start justify-between">
						<h3 className="mr-2 text-sm [&_strong]:font-semibold">
							<Markdown>{notification.subject}</Markdown>
						</h3>
					</div>
					<div>
						<p className="text-muted-foreground mb-2 text-sm">
							<Markdown>{notification.body}</Markdown>
						</p>
						<div className="flex justify-between space-x-2">
							<div>
								{notification.primaryAction &&
									renderAction(notification.primaryAction, true)}
								{notification.secondaryAction &&
									renderAction(notification.secondaryAction, false)}
							</div>
							<div className="flex shrink-0 items-center space-x-2">
								{!isHovered ? (
									<p className="text-muted-foreground text-xs whitespace-nowrap">
										{formatRelativeTime(notification.createdAt)}
									</p>
								) : (
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="xs"
													onClick={handleMarkAsReadUnread}
												>
													{notification.isRead ? (
														<Icon name="bell" className="h-3 w-3" />
													) : (
														<Icon name="check-circled" className="h-3 w-3" />
													)}
												</Button>
											</TooltipTrigger>
											<TooltipContent>
												<p>
													{notification.isRead
														? 'Mark as unread'
														: 'Mark as read'}
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								)}
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function EmptyState() {
	const cardVariants = [
		{ rotate: -10, y: 0, x: -20 },
		{ rotate: 10, y: 40, x: 20 },
		{ rotate: -10, y: 80, x: -20 },
	]

	return (
		<div className="px-4 py-12">
			<div className="relative mx-auto h-40 w-full max-w-[280px]">
				{cardVariants.map((variant, index) => (
					<motion.div
						key={index}
						className="absolute right-0 left-0 w-full"
						initial={{ opacity: 0, y: 20 }}
						animate={{
							opacity: 1,
							y: variant.y,
							x: variant.x,
							rotate: variant.rotate,
							transition: {
								duration: 0.4,
								delay: index * 0.1,
								ease: [0.22, 1, 0.36, 1],
							},
						}}
					>
						<div className="border-border bg-background mx-auto w-full rounded-lg border p-4 shadow-sm">
							<div className="flex items-center space-x-3">
								<div className="bg-muted h-8 w-8 rounded-full" />
								<div className="flex-1 space-y-2">
									<div className="bg-muted h-2 w-3/4 rounded-full" />
									<div className="bg-muted h-2 w-1/2 rounded-full" />
								</div>
							</div>
						</div>
					</motion.div>
				))}
			</div>
			<div className="mt-8 text-center">
				<h3 className="text-foreground text-lg font-medium">
					Nothing here yet!
				</h3>
				<p className="text-muted-foreground mt-1 text-sm">
					When you get notifications, they'll show up here.
				</p>
			</div>
		</div>
	)
}

export default function NotificationBell() {
	const [filter, setFilter] = useState<'all' | 'unread'>('all')
	const { notifications, isLoading, fetchMore, hasMore, readAll, refetch } =
		useNotifications({
			...(filter === 'unread' ? { read: false } : {}),
		})
	const novu = useNovu()
	const [isOpen, setIsOpen] = useState(false)

	const unreadCount = notifications?.filter((n) => !n.isRead).length || 0

	useEffect(() => {
		const listener = () => {
			refetch()
		}

		novu.on('notifications.notification_received', listener)

		return () => {
			novu.off('notifications.notification_received', listener)
		}
	}, [novu])

	const handleLoadMore = () => {
		if (hasMore) {
			fetchMore()
		}
	}

	const handleReadAll = async () => {
		try {
			await readAll()
		} catch (error) {
			console.error('Error marking all notifications as read:', error)
		}
	}

	const handleFilterChange = (value: 'all' | 'unread') => {
		setFilter(value)
	}

	const filterTitles = {
		all: 'All Notifications',
		unread: 'Unread Notifications',
	}

	const containerVariants = {
		hidden: { opacity: 0, scale: 0.95, y: -20 },
		visible: {
			opacity: 1,
			scale: 1,
			y: 0,
			transition: {
				duration: 0.2,
				staggerChildren: 0.1,
			},
		},
	}

	const itemVariants = {
		hidden: { opacity: 0, x: -20 },
		visible: { opacity: 1, x: 0 },
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<motion.button
					className="relative flex h-8 w-8 items-center justify-center rounded-full border p-0.5"
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
				>
					<Icon name="bell" className="h-4 w-4" />
					<AnimatePresence>
						{unreadCount > 0 && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								className="absolute -top-2 -right-3"
							>
								<Badge variant="destructive" className="px-2 py-1 text-xs">
									{unreadCount}
								</Badge>
							</motion.div>
						)}
					</AnimatePresence>
					<span className="sr-only">Toggle notifications</span>
				</motion.button>
			</PopoverTrigger>
			<PopoverContent className="w-[400px] p-0" align="end">
				<motion.div
					initial="hidden"
					animate="visible"
					exit="hidden"
					variants={containerVariants}
				>
					<Card className="border-0 p-0 shadow-none">
						<CardHeader className="border-b px-2 py-0 pt-2 [.border-b]:pb-0">
							<div className="flex justify-between">
								<div className="mt-1 flex-1">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												className="h-auto p-0 focus:outline-none"
											>
												{filterTitles[filter]}
												<Icon
													name="chevron-down"
													className="ml-2 inline h-4 w-4"
												/>
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<DropdownMenuItem
												onClick={() => handleFilterChange('all')}
											>
												All Notifications
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleFilterChange('unread')}
											>
												Unread Notifications
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
											<Icon name="ellipsis" className="h-4 w-4" />
											<span className="sr-only">Open menu</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={handleReadAll}>
											<Icon name="check-circled" className="mr-2 h-4 w-4" />
											Mark all as read
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							{isLoading ? (
								<div className="flex h-[calc(100vh-200px)] max-h-[500px] items-center justify-center">
									<motion.div
										animate={{ rotate: 360 }}
										transition={{
											duration: 1,
											repeat: Infinity,
											ease: 'linear',
										}}
									>
										<Icon name="bell" className="text-primary h-8 w-8" />
									</motion.div>
								</div>
							) : (
								<ScrollArea className="h-[calc(100vh-200px)] max-h-[500px]">
									{notifications?.length === 0 ? (
										<EmptyState />
									) : (
										<div className="flex flex-col gap-4 p-4">
											{notifications?.map((notification: Notification) => (
												<motion.div
													key={notification.id}
													variants={itemVariants}
												>
													<NotificationItem notification={notification} />
												</motion.div>
											))}
											{hasMore && (
												<Button
													variant="ghost"
													className="mt-4 w-full"
													onClick={handleLoadMore}
												>
													Load More{' '}
													<Icon name="chevron-down" className="ml-2 h-4 w-4" />
												</Button>
											)}
										</div>
									)}
								</ScrollArea>
							)}
						</CardContent>
					</Card>
				</motion.div>
			</PopoverContent>
		</Popover>
	)
}
