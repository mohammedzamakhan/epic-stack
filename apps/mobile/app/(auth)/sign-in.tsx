import React, { useState, useRef } from 'react'
import {
	View,
	Text,
	StyleSheet,
	Alert,
	TouchableOpacity,
	ScrollView,
	TextInput,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MobileLoginFormSchema } from '@repo/validation'
import type { z } from 'zod'
import {
	Screen,
	Input,
	Button,
	ErrorText,
	Checkbox,
	Divider,
	SocialButton,
	LoadingOverlay,
	SuccessAnimation,
} from '../../components/ui'
import { useLogin } from '../../lib/auth/hooks/use-auth-actions'
import { useOAuthProviders } from '../../lib/auth/hooks/use-oauth'
import { navigateToSignUp, navigateAfterAuth } from '../../lib/navigation'
import { dismissKeyboard } from '../../lib/keyboard'
import { triggerSuccessHaptic, triggerErrorHaptic } from '../../lib/haptics'

type LoginFormData = z.infer<typeof MobileLoginFormSchema>

export default function SignInScreen() {
	const { banned, redirectTo } = useLocalSearchParams<{
		banned?: string
		redirectTo?: string
	}>()
	const isBanned = banned === 'true'

	const {
		login,
		isLoading: isLoginLoading,
		error: loginError,
		clearError,
	} = useLogin()
	const { configuredProviders } = useOAuthProviders()

	const [showPassword, setShowPassword] = useState(false)
	const [showSuccess, setShowSuccess] = useState(false)

	// Input refs for focus management
	const usernameRef = useRef<TextInput>(null)
	const passwordRef = useRef<TextInput>(null)

	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
		reset,
	} = useForm<LoginFormData>({
		resolver: zodResolver(MobileLoginFormSchema),
		mode: 'onChange',
		defaultValues: {
			username: '',
			password: '',
			remember: false,
		},
	})

	const onSubmit = async (data: LoginFormData) => {
		try {
			console.log('🔐 Attempting login with:', {
				username: data.username,
				remember: data.remember,
			})

			// Clear any previous errors
			clearError()

			// Dismiss keyboard before submitting
			dismissKeyboard()

			await login({
				username: data.username,
				password: data.password,
				remember: data.remember,
				redirectTo: redirectTo || undefined,
			})

			// If we get here, login was successful (no error thrown)
			console.log('✅ Login successful, showing success animation')

			// Show success animation and haptic feedback
			await triggerSuccessHaptic()
			setShowSuccess(true)

			// Navigate after a brief delay to show success animation
			setTimeout(() => {
				setShowSuccess(false)
				navigateAfterAuth(redirectTo)
			}, 1500)

			// Reset form on success
			reset()
		} catch (error) {
			console.error('❌ Login submission error:', error)
			// Trigger error haptic feedback
			await triggerErrorHaptic()
			// Error will be displayed via the error state from useLogin
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

	const handleForgotPassword = () => {
		Alert.alert(
			'Forgot Password',
			'Forgot password functionality will be available soon. Please contact support for assistance.',
			[{ text: 'OK' }],
		)
	}

	const handleNavigateToSignUp = () => {
		navigateToSignUp(redirectTo)
	}

	const currentError = loginError
	const isLoading = isLoginLoading

	return (
		<Screen style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Welcome back</Text>
					<Text style={styles.subtitle}>
						Sign in with your social account or username
					</Text>
				</View>

				{/* Content */}
				<View style={styles.content}>
					{/* Banned Account Warning */}
					{isBanned && (
						<View style={styles.bannedContainer}>
							<View style={styles.bannedHeader}>
								<Text style={styles.bannedIcon}>🔒</Text>
								<Text style={styles.bannedTitle}>Account Suspended</Text>
							</View>
							<Text style={styles.bannedMessage}>
								Your account has been suspended. Please contact support if
								you believe this is an error.
							</Text>
							<TouchableOpacity
								style={styles.supportButton}
								onPress={() =>
									Alert.alert(
										'Contact Support',
										'Please email support@example.com for assistance.',
									)
								}
							>
								<Text style={styles.supportButtonText}>
									Contact Support
								</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* Social Login Buttons */}
					<View style={styles.socialContainer}>
						{configuredProviders.map((provider) => (
							<SocialButton
								key={provider}
								provider={provider as 'github' | 'google'}
								type="login"
								disabled={isLoading || isBanned}
								redirectTo={redirectTo}
								onSuccess={handleSocialSuccess}
								onError={handleSocialError}
							/>
						))}
					</View>

					{/* Divider */}
					<Divider text="Or continue with username" />

					{/* Error Display */}
					{currentError && (
						<ErrorText style={styles.errorContainer}>
							{currentError}
						</ErrorText>
					)}

					{/* Login Form */}
					<View style={styles.formContainer}>
						<View style={styles.inputContainer}>
							<Text style={styles.label}>Username</Text>
							<Controller
								control={control}
								name="username"
								render={({ field: { onChange, onBlur, value } }) => (
									<Input
										ref={usernameRef}
										placeholder="Enter your username"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										inputType="username"
										nextInputRef={passwordRef}
										editable={!isLoading && !isBanned}
										error={!!errors.username}
									/>
								)}
							/>
							{errors.username && (
								<ErrorText>{errors.username.message}</ErrorText>
							)}
						</View>

						<View style={styles.inputContainer}>
							<View style={styles.passwordHeader}>
								<Text style={styles.label}>Password</Text>
								<TouchableOpacity onPress={handleForgotPassword}>
									<Text style={styles.forgotLink}>Forgot password?</Text>
								</TouchableOpacity>
							</View>
							<Controller
								control={control}
								name="password"
								render={({ field: { onChange, onBlur, value } }) => (
									<Input
										ref={passwordRef}
										placeholder="Enter your password"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										secureTextEntry={!showPassword}
										inputType="password"
										onSubmitEditing={handleSubmit(onSubmit)}
										editable={!isLoading && !isBanned}
										error={!!errors.password}
										rightIcon={
											<TouchableOpacity
												onPress={() => setShowPassword(!showPassword)}
												style={styles.eyeButton}
											>
												<Text style={styles.eyeIcon}>
													{showPassword ? '🙈' : '👁️'}
												</Text>
											</TouchableOpacity>
										}
									/>
								)}
							/>
							{errors.password && (
								<ErrorText>{errors.password.message}</ErrorText>
							)}
						</View>

						{/* Remember Me Checkbox */}
						<View style={styles.checkboxContainer}>
							<Controller
								control={control}
								name="remember"
								render={({ field: { onChange, value } }) => (
									<Checkbox
										checked={value}
										onCheckedChange={onChange}
										label="Remember me"
										disabled={isLoading || isBanned}
									/>
								)}
							/>
						</View>

						{/* Submit Button */}
						<Button
							onPress={handleSubmit(onSubmit)}
							disabled={!isValid || isLoading || isBanned}
							loading={isLoginLoading}
							style={styles.submitButton}
						>
							Sign In
						</Button>
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>Don't have an account? </Text>
					<TouchableOpacity onPress={handleNavigateToSignUp}>
						<Text style={styles.footerLinkText}>Create account</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Loading Overlay */}
			<LoadingOverlay visible={isLoginLoading} message="Signing you in..." />

			{/* Success Animation */}
			<SuccessAnimation
				visible={showSuccess}
				message="Welcome back!"
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
	bannedContainer: {
		backgroundColor: '#fef2f2',
		borderColor: '#fecaca',
		borderWidth: 1,
		borderRadius: 8,
		padding: 16,
		marginBottom: 24,
	},
	bannedHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	bannedIcon: {
		fontSize: 20,
		marginRight: 8,
	},
	bannedTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#dc2626',
	},
	bannedMessage: {
		fontSize: 14,
		color: '#7f1d1d',
		marginBottom: 12,
		lineHeight: 20,
	},
	supportButton: {
		backgroundColor: '#dc2626',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 6,
		alignSelf: 'flex-start',
	},
	supportButtonText: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '600',
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
	passwordHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	forgotLink: {
		fontSize: 14,
		color: '#3b82f6',
		fontWeight: '500',
	},
	eyeButton: {
		padding: 4,
	},
	eyeIcon: {
		fontSize: 18,
	},
	checkboxContainer: {
		marginTop: 8,
	},
	submitButton: {
		marginTop: 8,
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
