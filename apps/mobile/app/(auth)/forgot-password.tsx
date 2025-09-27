import React from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
	Screen,
	Input,
	Button,
	ErrorText,
} from '../../components/ui'
import { navigateToSignIn } from '../../lib/navigation'

const ForgotPasswordSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>

export default function ForgotPasswordScreen() {
	const { redirectTo } = useLocalSearchParams<{
		redirectTo?: string
	}>()

	const {
		control,
		handleSubmit,
		formState: { errors, isValid },
		reset,
	} = useForm<ForgotPasswordFormData>({
		resolver: zodResolver(ForgotPasswordSchema),
		mode: 'onBlur',
		defaultValues: {
			email: '',
		},
	})

	const onSubmit = async (data: ForgotPasswordFormData) => {
		// TODO: Implement forgot password API call
		console.log('Forgot password for:', data.email)

		// For now, just show a success message
		alert(
			"If an account with that email exists, we've sent you a password reset link.",
		)
		reset()
	}

	const handleBackToSignIn = () => {
		navigateToSignIn(redirectTo)
	}

	return (
		<Screen style={styles.screen}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Reset your password</Text>
					<Text style={styles.subtitle}>
						Enter your email address and we'll send you a link to reset your
						password.
					</Text>
				</View>

				{/* Content */}
				<View style={styles.content}>
					<View style={styles.formContainer}>
						<View style={styles.inputContainer}>
							<Text style={styles.label}>Email</Text>
							<Controller
								control={control}
								name="email"
								render={({ field: { onChange, onBlur, value } }) => (
									<Input
										placeholder="m@example.com"
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										autoCapitalize="none"
										autoCorrect={false}
										autoComplete="email"
										keyboardType="email-address"
										returnKeyType="done"
										onSubmitEditing={handleSubmit(onSubmit)}
										error={!!errors.email}
										autoFocus
									/>
								)}
							/>
							{errors.email && (
								<ErrorText>{errors.email.message}</ErrorText>
							)}
						</View>

						<Button
							onPress={handleSubmit(onSubmit)}
							disabled={!isValid}
							style={styles.submitButton}
						>
							Send reset link
						</Button>
					</View>
				</View>

				{/* Footer */}
				<View style={styles.footer}>
					<Text style={styles.footerText}>Remember your password? </Text>
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
