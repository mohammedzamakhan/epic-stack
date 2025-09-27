import React, { useState } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	TextInput,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
	Screen,
	Button,
	ErrorText,
	LoadingOverlay,
} from '../../components/ui'
import { useVerify } from '../../lib/auth/hooks'
import { navigateToSignIn } from '../../lib/navigation'
import { dismissKeyboard } from '../../lib/keyboard/keyboard-utils'
import {
	triggerSuccessHaptic,
	triggerErrorHaptic,
} from '../../lib/haptics/haptic-utils'

const VerifyCodeSchema = z.object({
	code: z
		.string()
		.min(6, 'Code must be 6 characters')
		.max(6, 'Code must be 6 characters')
		.regex(/^[A-Za-z0-9]{6}$/, 'Code must contain only letters and numbers'),
})

type VerifyCodeFormData = z.infer<typeof VerifyCodeSchema>

export default function VerifyCodeScreen() {
	const {
		email,
		type = 'onboarding',
		redirectTo,
	} = useLocalSearchParams<{
		email?: string
		type?: string
		redirectTo?: string
	}>()

	const { verify, isLoading, error, clearError } = useVerify()
	const [isResending, setIsResending] = useState(false)

	const {
		control,
		handleSubmit,
		formState: { errors },
		reset,
		watch,
	} = useForm<VerifyCodeFormData>({
		resolver: zodResolver(VerifyCodeSchema),
		mode: 'onChange',
		defaultValues: {
			code: '',
		},
	})

	const codeValue = watch('code')

	// Auto-submit when code is complete (disabled for debugging)
	// useEffect(() => {
	//   if (codeValue && codeValue.length === 6) {
	//     handleSubmit(onSubmit)()
	//   }
	// }, [codeValue, handleSubmit])

	const onSubmit = async (data: VerifyCodeFormData) => {
		if (!email) {
			Alert.alert('Error', 'No email address provided for verification.')
			return
		}

		try {
			// Dismiss keyboard before submitting
			dismissKeyboard()

			await verify({
				code: data.code,
				type: type as 'onboarding',
				target: email,
				redirectTo,
			})

			// Show success haptic feedback
			await triggerSuccessHaptic()

			// Navigate to onboarding screen with verification token
			router.push({
				pathname: '/(auth)/onboarding',
				params: {
					email,
					verified: 'true', // Flag to indicate email was verified
					...(redirectTo && { redirectTo }),
				},
			})
		} catch (error) {
			// Trigger error haptic feedback
			await triggerErrorHaptic()
			console.error('Verification error:', error)
		}
	}

	const handleResendCode = async () => {
		if (!email) {
			Alert.alert('Error', 'No email address provided for resending code.')
			return
		}

		setIsResending(true)
		try {
			// TODO: Implement resend verification code API call
			console.log('Resending verification code to:', email)

			// Clear any existing errors
			if (error) {
				clearError()
			}

			// Reset the form
			reset()

			Alert.alert(
				'Code Sent',
				"We've sent a new verification code to your email address.",
				[{ text: 'OK' }],
			)
		} catch {
			Alert.alert(
				'Error',
				'Failed to resend verification code. Please try again later.',
			)
		} finally {
			setIsResending(false)
		}
	}

	const handleBackToSignUp = () => {
		router.back()
	}

	const handleGoToSignIn = () => {
		navigateToSignIn(redirectTo)
	}

	return (
		<Screen style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Enter verification code</Text>
					<Text style={styles.subtitle}>
						{email
							? `We've sent a 6-character code to ${email}. Enter it below to verify your account.`
							: 'Enter the 6-character verification code sent to your email.'}
					</Text>
				</View>

				{/* Content */}
				<View style={styles.content}>
					<View style={styles.formContainer}>
						<Controller
							control={control}
							name="code"
							render={({ field: { onChange, value } }) => (
								<View style={styles.otpContainer}>
									<Text style={styles.otpLabel}>
										Enter 6-character code:
									</Text>
									<TextInput
										style={[
											styles.singleOtpInput,
											errors.code && styles.singleOtpInputError,
											isLoading && styles.singleOtpInputDisabled,
										]}
										value={value}
										onChangeText={(text) => {
											// Allow alphanumeric characters and limit to 6 characters
											const code = text
												.replace(/[^A-Za-z0-9]/g, '')
												.slice(0, 6)
												.toUpperCase()
											console.log('OTP Input changed:', code)
											onChange(code)
										}}
										placeholder="ABC123"
										keyboardType="default"
										maxLength={6}
										editable={!isLoading}
										autoFocus={true}
										selectTextOnFocus={true}
										returnKeyType="done"
										onSubmitEditing={() => {
											if (value.length === 6) {
												void handleSubmit(onSubmit)()
											}
										}}
									/>
								</View>
							)}
						/>

						{errors.code && (
							<ErrorText style={styles.errorText}>
								{errors.code.message}
							</ErrorText>
						)}

						{error && (
							<ErrorText style={styles.errorText}>{error}</ErrorText>
						)}

						<View style={styles.actionsContainer}>
							<Button
								onPress={handleSubmit(onSubmit)}
								disabled={isLoading || !codeValue || codeValue.length !== 6}
								style={styles.actionButton}
							>
								{isLoading ? 'Verifying...' : 'Verify Code'}
							</Button>

							<Text style={styles.helpText}>
								Didn't receive the code? Check your spam folder or request a
								new one.
							</Text>

							<Button
								onPress={handleResendCode}
								variant="outline"
								style={styles.actionButton}
								disabled={isResending}
							>
								{isResending ? 'Sending...' : 'Resend code'}
							</Button>
						</View>
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<TouchableOpacity onPress={handleBackToSignUp}>
						<Text style={styles.footerLinkText}>Back to sign up</Text>
					</TouchableOpacity>

					<Text style={styles.footerSeparator}>•</Text>

					<TouchableOpacity onPress={handleGoToSignIn}>
						<Text style={styles.footerLinkText}>
							Already have an account?
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{isLoading && (
				<LoadingOverlay visible={isLoading} message="Verifying code..." />
			)}
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
	formContainer: {
		gap: 20,
	},
	otpContainer: {
		alignItems: 'center',
		marginBottom: 8,
	},
	otpLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 12,
		textAlign: 'center',
	},
	singleOtpInput: {
		width: '100%',
		height: 60,
		borderWidth: 2,
		borderColor: '#e5e7eb',
		borderRadius: 12,
		backgroundColor: '#ffffff',
		fontSize: 24,
		fontWeight: '600',
		color: '#1f2937',
		textAlign: 'center',
		letterSpacing: 8,
	},
	singleOtpInputError: {
		borderColor: '#ef4444',
		backgroundColor: '#fef2f2',
	},
	singleOtpInputDisabled: {
		backgroundColor: '#f3f4f6',
		color: '#9ca3af',
	},
	errorText: {
		textAlign: 'center',
		marginTop: 8,
	},
	actionsContainer: {
		gap: 16,
		alignItems: 'center',
		marginTop: 24,
	},
	helpText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		lineHeight: 20,
	},
	actionButton: {
		width: '100%',
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 32,
		marginTop: 'auto',
		gap: 8,
	},
	footerLinkText: {
		fontSize: 16,
		color: '#3b82f6',
		fontWeight: '600',
	},
	footerSeparator: {
		fontSize: 16,
		color: '#9ca3af',
	},
})
