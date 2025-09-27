import React, { useEffect, useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import {
	Screen,
	Button,
	ErrorText,
} from '../../components/ui'
import { navigateToSignIn } from '../../lib/navigation'

export default function VerifyEmailScreen() {
	const { token, email, redirectTo } = useLocalSearchParams<{
		token?: string
		email?: string
		redirectTo?: string
	}>()

	const [isVerifying, setIsVerifying] = useState(false)
	const [verificationError, setVerificationError] = useState<string | null>(
		null,
	)
	const [isVerified, setIsVerified] = useState(false)

	useEffect(() => {
		// If we have a token, automatically attempt verification
		if (token) {
			void handleVerifyEmail(token)
		}
	}, [token])

	const handleVerifyEmail = async (verificationToken: string) => {
		setIsVerifying(true)
		setVerificationError(null)

		try {
			// TODO: Implement email verification API call
			console.log('Verifying email with token:', verificationToken)

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// For now, just mark as verified
			setIsVerified(true)

			Alert.alert(
				'Email Verified!',
				'Your email has been successfully verified. You can now sign in to your account.',
				[
					{
						text: 'Continue to Sign In',
						onPress: () => {
							navigateToSignIn(redirectTo)
						},
					},
				],
			)
		} catch (_error) {
			setVerificationError(
				_error instanceof Error ? _error.message : 'Email verification failed',
			)
		} finally {
			setIsVerifying(false)
		}
	}

	const handleResendVerification = async () => {
		if (!email) {
			Alert.alert(
				'Error',
				'No email address provided for resending verification.',
			)
			return
		}

		try {
			// TODO: Implement resend verification API call
			console.log('Resending verification to:', email)

			Alert.alert(
				'Verification Email Sent',
				"We've sent another verification email to your inbox. Please check your email and click the verification link.",
				[{ text: 'OK' }],
			)
		} catch {
			Alert.alert(
				'Error',
				'Failed to resend verification email. Please try again later.',
			)
		}
	}

	const handleBackToSignIn = () => {
		navigateToSignIn(redirectTo)
	}

	if (isVerifying) {
		return (
			<Screen style={styles.screen}>
				<View style={styles.centerContainer}>
					<View style={styles.loadingContainer}>
						<Text style={styles.loadingIcon}>⏳</Text>
						<Text style={styles.title}>Verifying your email...</Text>
						<Text style={styles.subtitle}>
							Please wait while we verify your email address.
						</Text>
					</View>
				</View>
			</Screen>
		)
	}

	if (isVerified) {
		return (
			<Screen style={styles.screen}>
				<View style={styles.centerContainer}>
					<View style={styles.successContainer}>
						<Text style={styles.successIcon}>✅</Text>
						<Text style={styles.title}>Email Verified!</Text>
						<Text style={styles.subtitle}>
							Your email has been successfully verified. You can now sign in
							to your account.
						</Text>

						<Button
							onPress={handleBackToSignIn}
							style={styles.actionButton}
						>
							Continue to Sign In
						</Button>
					</View>
				</View>
			</Screen>
		)
	}

	return (
		<Screen style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Verify your email</Text>
					<Text style={styles.subtitle}>
						{email
							? `We've sent a verification link to ${email}. Click the link in your email to verify your account.`
							: 'Check your email for a verification link to complete your account setup.'}
					</Text>
				</View>

				{/* Content */}
				<View style={styles.content}>
					{verificationError && (
						<ErrorText style={styles.errorContainer}>
							{verificationError}
						</ErrorText>
					)}

					<View style={styles.actionsContainer}>
						<Text style={styles.helpText}>
							Didn't receive the email? Check your spam folder or request a
							new one.
						</Text>

						{email && (
							<Button
								onPress={handleResendVerification}
								variant="outline"
								style={styles.actionButton}
							>
								Resend verification email
							</Button>
						)}
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<TouchableOpacity onPress={handleBackToSignIn}>
						<Text style={styles.footerLinkText}>Back to sign in</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	screen: {
		backgroundColor: '#ffffff',
	},
	scrollContainer: {
		flexGrow: 1,
		paddingHorizontal: 24,
		paddingTop: 60,
		paddingBottom: 40,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 24,
	},
	header: {
		marginBottom: 40,
		alignItems: 'center',
	},
	title: {
		fontSize: 32,
		fontWeight: '700',
		textAlign: 'center',
		marginBottom: 12,
		color: '#1f2937',
	},
	subtitle: {
		fontSize: 16,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 24,
	},
	content: {
		flex: 1,
	},
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	loadingIcon: {
		fontSize: 48,
		marginBottom: 16,
	},
	successContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},
	successIcon: {
		fontSize: 48,
		marginBottom: 16,
	},
	errorContainer: {
		marginBottom: 16,
		textAlign: 'center',
	},
	actionsContainer: {
		gap: 16,
		alignItems: 'center',
	},
	helpText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 20,
	},
	actionButton: {
		width: '100%',
		marginTop: 8,
	},
	footer: {
		alignItems: 'center',
		paddingTop: 32,
		marginTop: 'auto',
	},
	footerLinkText: {
		fontSize: 16,
		color: '#3b82f6',
		fontWeight: '600',
	},
})
