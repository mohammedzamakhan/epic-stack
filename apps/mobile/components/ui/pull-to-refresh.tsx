import React from 'react'
import { ScrollView, RefreshControl, type ScrollViewProps } from 'react-native'
import { triggerHaptic } from '../../lib/haptics'

export interface PullToRefreshProps extends ScrollViewProps {
	onRefresh: () => Promise<void> | void
	refreshing: boolean
	hapticFeedback?: boolean
	className?: string
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
	children,
	onRefresh,
	refreshing,
	hapticFeedback = true,
	className,
	...props
}) => {
	const handleRefresh = async () => {
		if (hapticFeedback) {
			await triggerHaptic('light')
		}
		await onRefresh()
	}

	return (
		<ScrollView
			className={className}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={handleRefresh}
					tintColor="#3B82F6"
					colors={['#3B82F6']}
				/>
			}
			{...props}
		>
			{children}
		</ScrollView>
	)
}

export { PullToRefresh }
