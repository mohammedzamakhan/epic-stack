import React from 'react'
import { ScrollView, RefreshControl, ScrollViewProps } from 'react-native'
import { triggerHaptic } from '../../lib/haptics'

export interface PullToRefreshProps extends ScrollViewProps {
	onRefresh: () => Promise<void> | void
	refreshing: boolean
	hapticFeedback?: boolean
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
	children,
	onRefresh,
	refreshing,
	hapticFeedback = true,
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
