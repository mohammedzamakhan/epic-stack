import { useLingui } from '@lingui/react/macro'
import React from 'react'
import { View, Text, Modal, ActivityIndicator } from 'react-native'

export interface LoadingOverlayProps {
	visible: boolean
	message?: string
	transparent?: boolean
	className?: string
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
	visible,
	message,
	transparent = true,
}) => {
	const { t } = useLingui()
	const displayMessage = message ?? t`Loading...`
	if (!visible) return null

	return (
		<Modal
			transparent={transparent}
			animationType="fade"
			visible={visible}
			statusBarTranslucent
		>
			<View className="flex-1 items-center justify-center bg-black/50">
				<View className="bg-card min-w-30 items-center rounded-xl p-6 shadow-lg">
					<ActivityIndicator size="large" className="text-primary" />
					{displayMessage && (
						<Text className="text-foreground mt-3 text-center text-base">
							{displayMessage}
						</Text>
					)}
				</View>
			</View>
		</Modal>
	)
}

export { LoadingOverlay }
