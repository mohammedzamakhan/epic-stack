import * as Linking from 'expo-linking'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { AuthGuard } from '../components/auth-guard'
import { AuthProvider } from '../lib/auth/auth-context'
import { handleDeepLink } from '../lib/navigation'

export default function RootLayout() {
	useEffect(() => {
		// Configure deep linking for authentication redirects
		Linking.createURL('/')

		// Handle initial URL if app was opened via deep link
		const handleInitialURL = async () => {
			const initialUrl = await Linking.getInitialURL()
			if (initialUrl) {
				// Handle the deep link after a short delay to ensure navigation is ready
				setTimeout(() => {
					void handleDeepLink(initialUrl)
				}, 500)
			}
		}

		void handleInitialURL()

		// Listen for incoming links while app is running
		const subscription = Linking.addEventListener('url', (event) => {
			void handleDeepLink(event.url)
		})

		return () => {
			subscription?.remove()
		}
	}, [])

	return (
		<AuthProvider>
			<StatusBar style="auto" />
			<Stack screenOptions={{ headerShown: false }}>
				{/* Root index screen for initial routing */}
				<Stack.Screen
					name="index"
					options={{
						headerShown: false,
						// Prevent going back to index screen
						gestureEnabled: false,
					}}
				/>

				{/* Authentication group - unauthenticated users */}
				<Stack.Screen
					name="(auth)"
					options={{
						headerShown: false,
						// Allow navigation within auth group
						gestureEnabled: true,
					}}
				/>

				{/* Dashboard group - authenticated users */}
				<Stack.Screen
					name="(dashboard)"
					options={{
						headerShown: false,
						// Prevent going back to auth screens when authenticated
						gestureEnabled: false,
					}}
				/>

				{/* OAuth callback screen - special handling */}
				<Stack.Screen
					name="auth/callback"
					options={{
						headerShown: false,
						// Prevent manual navigation to callback
						gestureEnabled: false,
						// Hide from navigation history
						presentation: 'transparentModal',
					}}
				/>
			</Stack>

			{/* Auth guard handles protected route logic */}
			<AuthGuard />
		</AuthProvider>
	)
}
