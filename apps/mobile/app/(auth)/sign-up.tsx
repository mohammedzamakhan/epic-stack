import React, { useState, useRef } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Alert,
	TouchableOpacity,
	TextInput,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MobileSignupSchema } from '@repo/validation'
import type { z } from 'zod'
import {
	Screen,
	Input,
	Button,
	ErrorText,
	Divider,
	SocialButton,
	LoadingOverlay,
	SuccessAnimation,
} from '../../components/ui'
import { useSignup } from '../../lib/auth/hooks/use-auth-actions'
import { useOAuthProviders } from '../../lib/auth/hooks/use-oauth'
import { navigateToSignIn, navigateAfterAuth } from '../../lib/navigation'
import { dismissKeyboard } from '../../lib/keyboard'
import { triggerSuccessHaptic, triggerErrorHaptic } from '../../lib/haptics'

type SignupFormData = z.infer<typeof MobileSignupSchema>

export default function SignUpScreen() {
	const { redirectTo, inviteToken } = useLocalSearchParams<{
		redirectTo?: string
		inviteToken?: string
	}>()

	const {
		signup,
		isLoading: isSignupLoading,
		error: signupError,
		clearError,
	} = useSignup()
	const { configuredProviders } = useOAuthProviders()

	const [showSuccess, setShowSuccess] = useState(false)

	// Input ref for focus management
	const emailRef = useRef<TextInput>(null)

	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
		reset,
	} = useForm<SignupFormData>({
		resolver: zodResolver(MobileSignupSchema),
		mode: 'onChange',
		defaultValues: {
			email: '',
		},
	})

	const onSubmit = async (data: SignupFormData) => {
		try {
			// Clear any previous errors
			clearError()

			// Dismiss keyboard before submitting
			dismissKeyboard()

			await signup(data.email)

			// Show success alert
			Alert.alert(
				'Check your email',
				"We've sent you a verification link to complete your signup.",
				[
					{
						text: 'OK',
						onPress: () => {
							// Navigate to verification screen with email parameter
							router.push({
								pathname: '/(auth)/verify-code',
								params: {
									email: data.email,
									type: 'onboarding',
									...(redirectTo && { redirectTo }),
								},
							})
						},
					},
				],
			)

			// Show success animation and haptic feedback
			await triggerSuccessHaptic()
			setShowSuccess(true)

			// Reset form on success
			reset()
		} catch (error) {
			// Trigger error haptic feedback
			await triggerErrorHaptic()
			console.error('Signup submission error:', error)
		}
	}

	const handleSocialSuccess = async () => {
		// Show success animation and haptic feedback
		await triggerSuccessHaptic()
		setShowSuccess(true)

		// Navigate after a brief delay to show success animation
		setTimeout(() => {
			setShowSuccess(false)
			navigateAfterAuth(redirectTo)
		}, 1500)

		clearError()
	}

	const handleSocialError = async (error: string) => {
		await triggerErrorHaptic()
		Alert.alert('Authentication Error', error)
	}

	const handleNavigateToSignIn = () => {
		navigateToSignIn(redirectTo)
	}

	const currentError = signupError
	const isLoading = isSignupLoading

	// Determine if this is an organization invite signup
	const isInviteSignup = !!inviteToken

	return (
		<Screen style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>
						{isInviteSignup ? 'Join organization' : 'Create an account'}
					</Text>
					<Text style={styles.subtitle}>
						{isInviteSignup
							? 'Complete your signup to join the organization'
							: 'Sign up with your social account or email'}
					</Text>
				</View>

				{/* Content */}
				<View style={styles.content}>
					{/* Organization Invite Message */}
					{isInviteSignup && (
						<View style={styles.inviteContainer}>
							<View style={styles.inviteHeader}>
								<Text style={styles.inviteIcon}>📧</Text>
								<Text style={styles.inviteTitle}>Organization Invite</Text>
							</View>
							<Text style={styles.inviteMessage}>
								You've been invited to join an organization. Complete your
								signup to get started.
							</Text>
						</View>
					)}

					{/* Social Signup Buttons */}
					<View style={styles.socialContainer}>
						{configuredProviders.map((provider) => (
							<SocialButton
								key={provider}
								provider={provider as 'github' | 'google'}
								type="signup"
								disabled={isLoading}
								redirectTo={redirectTo}
								onSuccess={handleSocialSuccess}
								onError={handleSocialError}
							/>
						))}
					</View>

					{/* Divider */}
					<Divider text="Or continue with email" />

					{/* Error Display */}
					{currentError && (
						<ErrorText style={styles.errorContainer}>
							{currentError}
						</ErrorText>
					)}

					{/* Signup Form */}
					<View style={styles.formContainer}>
						<View style={styles.inputContainer}>
							<Text style={styles.label}>Email</Text>
							<Controller
								control={control}
								name="email"
								render={({ field: { onChange, onBlur, value } }) => (
									<Input
										ref={emailRef}
										placeholder="m@example.com"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										inputType="email"
										onSubmitEditing={handleSubmit(onSubmit)}
										editable={!isLoading}
										error={!!errors.email}
										autoFocus
									/>
								)}
							/>
							{errors.email && (
								<ErrorText>{errors.email.message}</ErrorText>
							)}
						</View>

						{/* Submit Button */}
						<Button
							onPress={handleSubmit(onSubmit)}
							disabled={!isValid || isLoading}
							loading={isSignupLoading}
							style={styles.submitButton}
						>
							Sign up
						</Button>
					</View>

					{/* Terms and Privacy */}
					<Text style={styles.termsText}>
						By signing up, you agree to our{' '}
						<Text
							style={styles.termsLink}
							onPress={() =>
								Alert.alert(
									'Terms of Service',
									'Terms of Service will be available soon.',
								)
							}
						>
							Terms of Service
						</Text>{' '}
						and{' '}
						<Text
							style={styles.termsLink}
							onPress={() =>
								Alert.alert(
									'Privacy Policy',
									'Privacy Policy will be available soon.',
								)
							}
						>
							Privacy Policy
						</Text>
						.
					</Text>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>Already have an account? </Text>
					<TouchableOpacity onPress={handleNavigateToSignIn}>
						<Text style={styles.footerLinkText}>Sign in</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Loading Overlay */}
			<LoadingOverlay
				visible={isSignupLoading}
				message="Creating your account..."
			/>

			{/* Success Animation */}
			<SuccessAnimation
				visible={showSuccess}
				message="Account created!"
				onComplete={() => setShowSuccess(false)}
			/>
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
	inviteContainer: {
		backgroundColor: '#f0f9ff',
		borderColor: '#bae6fd',
		borderWidth: 1,
		borderRadius: 8,
		padding: 16,
		marginBottom: 24,
	},
	inviteHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	inviteIcon: {
		fontSize: 20,
		marginRight: 8,
	},
	inviteTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#0369a1',
	},
	inviteMessage: {
		fontSize: 14,
		color: '#0c4a6e',
		lineHeight: 20,
	},
	socialContainer: {
		gap: 8,
		marginBottom: 24,
	},
	errorContainer: {
		marginBottom: 16,
		textAlign: 'center',
	},
	formContainer: {
		gap: 16,
	},
	inputContainer: {
		gap: 8,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
	},
	submitButton: {
		marginTop: 8,
	},
	termsText: {
		fontSize: 12,
		color: '#6b7280',
		textAlign: 'center',
		marginTop: 16,
		lineHeight: 18,
	},
	termsLink: {
		color: '#3b82f6',
		fontWeight: '500',
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingTop: 32,
		marginTop: 'auto',
	},
	footerText: {
		fontSize: 16,
		color: '#6b7280',
	},
	footerLinkText: {
		fontSize: 16,
		color: '#3b82f6',
		fontWeight: '600',
	},
})
