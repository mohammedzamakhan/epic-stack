import { useLocalSearchParams, router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { Screen, Button, ErrorText } from '../../components/ui'
import { useOAuthCallback } from '../../lib/auth/hooks/use-oauth'

/**
 * OAuth callback screen that handles OAuth redirects
 * This screen is called when the user returns from OAuth provider authentication
 */
export default function OAuthCallbackScreen() {
	const { code, state, error, provider } = useLocalSearchParams<{
		code?: string
		state?: string
		error?: string
		provider?: string
	}>()

	const [callbackError, setCallbackError] = useState<string | null>(null)
	const { handleCallback, isProcessing } = useOAuthCallback()

	useEffect(() => {
		const processCallback = async () => {
			// Check for OAuth errors first
			if (error) {
				setCallbackError(`OAuth error: ${error}`)
				return
			}

			// Validate required parameters
			if (!code || !provider) {
				setCallbackError('Missing required OAuth parameters')
				return
			}

			try {
				// Construct the callback URL
				const callbackUrl = `epicnotes://auth/callback?code=${code}&state=${state || ''}`

				// Handle the OAuth callback
				const result = await handleCallback(callbackUrl, provider)

				if (result.success) {
					// Success! The auth context will handle navigation
					// We can navigate to a success screen or let the auth guard handle it
					router.replace('/')
				} else {
					setCallbackError(result.error || 'OAuth authentication failed')
				}
			} catch (err) {
				setCallbackError(
					err instanceof Error ? err.message : 'Unknown error occurred',
				)
			}
		}

		void processCallback()
	}, [code, state, error, provider, handleCallback])

	const handleRetry = () => {
		setCallbackError(null)
		router.replace('/(auth)/sign-in')
	}

	const handleGoHome = () => {
		router.replace('/')
	}

	if (isProcessing) {
		return (
			<Screen backgroundColor="#ffffff">
				<View className="flex-1 items-center justify-center p-5">
					<ActivityIndicator
						size="large"
						color="#3b82f6"
						accessibilityLabel="Loading"
					/>
					<Text className="text-foreground mt-4 mb-2 text-center text-2xl font-bold">
						Completing Authentication
					</Text>
					<Text className="text-muted-foreground text-center text-base leading-6">
						Please wait while we complete your authentication...
					</Text>
				</View>
			</Screen>
		)
	}

	if (callbackError) {
		return (
			<Screen className="bg-background flex-1">
				<View className="flex-1 items-center justify-center p-5">
					<Text className="mb-4 text-5xl" accessibilityLabel="Error">
						❌
					</Text>
					<Text className="text-foreground mt-4 mb-2 text-center text-2xl font-bold">
						Authentication Failed
					</Text>
					<ErrorText className="mb-6 text-center text-base">
						{callbackError}
					</ErrorText>

					<View className="w-full max-w-[300px]">
						<Button onPress={handleRetry} className="mb-3">
							Try Again
						</Button>
						<Button onPress={handleGoHome} variant="outline" className="mb-3">
							Go Home
						</Button>
					</View>
				</View>
			</Screen>
		)
	}

	// This should not be reached as the effect should handle all cases
	return (
		<Screen className="bg-background flex-1">
			<View className="flex-1 items-center justify-center p-5">
				<ActivityIndicator
					size="large"
					color="#3b82f6"
					accessibilityLabel="Loading"
				/>
				<Text className="text-foreground mt-4 mb-2 text-center text-2xl font-bold">
					Processing...
				</Text>
			</View>
		</Screen>
	)
}
