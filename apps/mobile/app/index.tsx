import { Trans, useLingui } from '@lingui/react/macro'
import { Redirect } from 'expo-router'
import React from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { useAuth } from '../lib/auth/hooks/use-auth'

/**
 * Root index screen that handles initial routing based on authentication state
 * This screen acts as the entry point and redirects users to the appropriate screen
 */
export default function IndexScreen() {
	const { t } = useLingui()
	const { isAuthenticated, isLoading } = useAuth()

	// Show loading screen while determining auth state
	if (isLoading) {
		return (
			<View className="bg-background flex-1 items-center justify-center">
				<ActivityIndicator
					size="large"
					color="#3b82f6"
					accessibilityLabel={t`Loading`}
				/>
				<Text className="text-muted-foreground mt-3 text-base">
					<Trans>Loading...</Trans>
				</Text>
			</View>
		)
	}

	// Redirect based on authentication state
	if (isAuthenticated) {
		return <Redirect href="/(dashboard)" />
	} else {
		return <Redirect href="/(auth)/landing" />
	}
}
