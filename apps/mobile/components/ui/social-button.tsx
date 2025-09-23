import React from 'react'
import {
	TouchableOpacity,
	Text,
	StyleSheet,
	View,
	ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useOAuth } from '../../lib/auth/hooks/use-oauth'

export interface SocialButtonProps {
	provider: 'github' | 'google'
	onPress?: () => void
	disabled?: boolean
	loading?: boolean
	type?: 'login' | 'signup'
	redirectTo?: string
	onSuccess?: () => void
	onError?: (error: string) => void
}

const providerConfig = {
	github: {
		label: 'GitHub',
		icon: 'logo-github' as const,
		backgroundColor: '#24292e',
		textColor: '#ffffff',
	},
	google: {
		label: 'Google',
		icon: 'logo-google' as const,
		backgroundColor: '#4285f4',
		textColor: '#ffffff',
	},
}

export function SocialButton({
	provider,
	onPress,
	disabled = false,
	loading: externalLoading = false,
	type = 'login',
	redirectTo,
	onSuccess,
	onError,
}: SocialButtonProps) {
	const config = providerConfig[provider]
	const actionText = type === 'login' ? 'Sign in' : 'Sign up'

	const {
		authenticate,
		isLoading: oauthLoading,
		isProviderConfigured,
	} = useOAuth({
		onSuccess,
		onError,
		redirectTo,
	})

	const handlePress = () => {
		if (isDisabled || isLoading) return

		if (onPress) {
			onPress()
		} else {
			void authenticate(provider)
		}
	}

	const isLoading = externalLoading || oauthLoading
	const isDisabled = disabled || !isProviderConfigured(provider)

	return (
		<TouchableOpacity
			style={[
				styles.button,
				{ backgroundColor: config.backgroundColor },
				isDisabled && styles.disabled,
			]}
			onPress={handlePress}
			disabled={isDisabled || isLoading}
			activeOpacity={0.8}
			accessibilityState={{ disabled: isDisabled || isLoading }}
		>
			<View style={styles.content}>
				{isLoading ? (
					<ActivityIndicator size="small" color={config.textColor} />
				) : (
					<Ionicons name={config.icon} size={20} color={config.textColor} />
				)}
				<Text style={[styles.text, { color: config.textColor }]}>
					{actionText} with {config.label}
				</Text>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	button: {
		borderRadius: 8,
		paddingVertical: 12,
		paddingHorizontal: 16,
		marginVertical: 4,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	text: {
		fontSize: 16,
		fontWeight: '600',
	},
	disabled: {
		opacity: 0.6,
	},
})
