import React, { useState, useRef } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
	Screen,
	Input,
	Button,
	ErrorText,
	Checkbox,
	LoadingOverlay,
	SuccessAnimation,
} from '../../components/ui'
import { useOnboarding } from '../../lib/auth/hooks'
import { navigateAfterAuth } from '../../lib/navigation'
import { dismissKeyboard } from '../../lib/keyboard/keyboard-utils'
import {
	triggerSuccessHaptic,
	triggerErrorHaptic,
} from '../../lib/haptics/haptic-utils'

const OnboardingSchema = z
	.object({
		username: z
			.string()
			.min(3, 'Username must be at least 3 characters')
			.max(20, 'Username must be less than 20 characters')
			.regex(
				/^[a-zA-Z0-9_]+$/,
				'Username can only contain letters, numbers, and underscores',
			),
		name: z
			.string()
			.min(3, 'Name must be at least 3 characters')
			.max(40, 'Name must be less than 40 characters'),
		password: z.string().min(6, 'Password must be at least 6 characters'),
		confirmPassword: z.string().min(6, 'Please confirm your password'),
		agreeToTermsOfServiceAndPrivacyPolicy: z
			.boolean()
			.refine((val) => val === true, {
				message: 'You must agree to the terms of service and privacy policy',
			}),
		remember: z.boolean().optional(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword'],
	})

type OnboardingFormData = z.infer<typeof OnboardingSchema>

export default function OnboardingScreen() {
	const { email, redirectTo } = useLocalSearchParams<{
		email?: string
		verified?: string
		redirectTo?: string
	}>()

	const { onboarding, isLoading, error, clearError } = useOnboarding()
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [showSuccess, setShowSuccess] = useState(false)

	// Input refs for focus management
	const usernameRef = useRef<TextInput>(null)
	const nameRef = useRef<TextInput>(null)
	const passwordRef = useRef<TextInput>(null)
	const confirmPasswordRef = useRef<TextInput>(null)

	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
	} = useForm<OnboardingFormData>({
		resolver: zodResolver(OnboardingSchema),
		mode: 'onBlur',
		defaultValues: {
			username: '',
			name: '',
			password: '',
			confirmPassword: '',
			agreeToTermsOfServiceAndPrivacyPolicy: false,
			remember: false,
		},
	})

	const onSubmit = async (data: OnboardingFormData) => {
		try {
			// Dismiss keyboard before submitting
			dismissKeyboard()

			// Clear any previous errors
			if (error) {
				clearError()
			}

			await onboarding({
				email: email || '', // Pass the email from verification
				username: data.username,
				name: data.name,
				password: data.password,
				confirmPassword: data.confirmPassword,
				agreeToTermsOfServiceAndPrivacyPolicy:
					data.agreeToTermsOfServiceAndPrivacyPolicy,
				remember: data.remember,
				redirectTo,
			})

			// Show success animation and haptic feedback
			await triggerSuccessHaptic()
			setShowSuccess(true)

			// Navigate after success animation
			setTimeout(() => {
				setShowSuccess(false)
				navigateAfterAuth(redirectTo)
			}, 2000)
		} catch (error) {
			// Trigger error haptic feedback
			await triggerErrorHaptic()
			console.error('Onboarding error:', error)
		}
	}

	const handleBackToVerification = () => {
		router.back()
	}

	return (
		<Screen style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Complete your profile</Text>
					<Text style={styles.subtitle}>
						{email
							? `Almost done! Create your profile for ${email}`
							: 'Just a few more details to complete your account setup.'}
					</Text>
				</View>

				{/* Content */}
				<View style={styles.content}>
					<View style={styles.formContainer}>
						<View style={styles.inputGroup}>
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
										autoCapitalize="none"
										autoCorrect={false}
										returnKeyType="next"
										onSubmitEditing={() => nameRef.current?.focus()}
										error={!!errors.username}
									/>
								)}
							/>
							{errors.username && (
								<ErrorText>{errors.username.message}</ErrorText>
							)}
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>Full Name</Text>
							<Controller
								control={control}
								name="name"
								render={({ field: { onChange, onBlur, value } }) => (
									<Input
										ref={nameRef}
										placeholder="Enter your full name"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										autoCapitalize="words"
										returnKeyType="next"
										onSubmitEditing={() => passwordRef.current?.focus()}
										error={!!errors.name}
									/>
								)}
							/>
							{errors.name && <ErrorText>{errors.name.message}</ErrorText>}
						</View>

						<View style={styles.inputGroup}>
							<Text style={styles.label}>Password</Text>
							<Controller
								control={control}
								name="password"
								render={({ field: { onChange, onBlur, value } }) => (
									<Input
										ref={passwordRef}
										placeholder="Create a password"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										secureTextEntry={!showPassword}
										autoCapitalize="none"
										autoCorrect={false}
										returnKeyType="next"
										onSubmitEditing={() =>
											confirmPasswordRef.current?.focus()
										}
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

						<View style={styles.inputGroup}>
							<Text style={styles.label}>Confirm Password</Text>
							<Controller
								control={control}
								name="confirmPassword"
								render={({ field: { onChange, onBlur, value } }) => (
									<Input
										ref={confirmPasswordRef}
										placeholder="Confirm your password"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										secureTextEntry={!showConfirmPassword}
										autoCapitalize="none"
										autoCorrect={false}
										returnKeyType="done"
										onSubmitEditing={handleSubmit(onSubmit)}
										error={!!errors.confirmPassword}
										rightIcon={
											<TouchableOpacity
												onPress={() =>
													setShowConfirmPassword(!showConfirmPassword)
												}
												style={styles.eyeButton}
											>
												<Text style={styles.eyeIcon}>
													{showConfirmPassword ? '🙈' : '👁️'}
												</Text>
											</TouchableOpacity>
										}
									/>
								)}
							/>
							{errors.confirmPassword && (
								<ErrorText>{errors.confirmPassword.message}</ErrorText>
							)}
						</View>

						<View style={styles.checkboxGroup}>
							<Controller
								control={control}
								name="agreeToTermsOfServiceAndPrivacyPolicy"
								render={({ field: { onChange, value } }) => (
									<Checkbox
										checked={value}
										onCheckedChange={onChange}
										label="I agree to the Terms of Service and Privacy Policy"
										error={!!errors.agreeToTermsOfServiceAndPrivacyPolicy}
									/>
								)}
							/>
							{errors.agreeToTermsOfServiceAndPrivacyPolicy && (
								<ErrorText style={styles.checkboxError}>
									{errors.agreeToTermsOfServiceAndPrivacyPolicy.message}
								</ErrorText>
							)}
						</View>

						<View style={styles.checkboxGroup}>
							<Controller
								control={control}
								name="remember"
								render={({ field: { onChange, value } }) => (
									<Checkbox
										checked={value}
										onCheckedChange={onChange}
										label="Keep me signed in"
									/>
								)}
							/>
						</View>

						{error && (
							<ErrorText style={styles.formError}>{error}</ErrorText>
						)}

						<Button
							onPress={handleSubmit(onSubmit)}
							disabled={!isValid || isLoading}
							style={styles.submitButton}
						>
							{isLoading ? 'Creating account...' : 'Create account'}
						</Button>
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<TouchableOpacity onPress={handleBackToVerification}>
						<Text style={styles.footerLinkText}>
							Back to verification
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{isLoading && (
				<LoadingOverlay visible={isLoading} message="Creating account..." />
			)}
			{showSuccess && (
				<SuccessAnimation visible={showSuccess} message="Account created!" />
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
	inputGroup: {
		gap: 8,
	},
	label: {
		fontSize: 16,
		fontWeight: '600',
		color: '#374151',
		marginBottom: 4,
	},
	checkboxGroup: {
		gap: 8,
	},
	checkboxError: {
		marginTop: 4,
	},
	formError: {
		textAlign: 'center',
		marginTop: 8,
	},
	submitButton: {
		marginTop: 8,
	},
	eyeButton: {
		padding: 4,
	},
	eyeIcon: {
		fontSize: 18,
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
