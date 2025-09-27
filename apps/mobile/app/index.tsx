import React from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '../lib/auth/hooks/use-auth'

/**
 * Root index screen that handles initial routing based on authentication state
 * This screen acts as the entry point and redirects users to the appropriate screen
 */
export default function IndexScreen() {
	const { isAuthenticated, isLoading } = useAuth()

	// Show loading screen while determining auth state
	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#3b82f6" />
				<Text style={styles.loadingText}>Loading...</Text>
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

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#ffffff',
	},
	loadingText: {
		fontSize: 16,
		color: '#6b7280',
		marginTop: 12,
	},
})
