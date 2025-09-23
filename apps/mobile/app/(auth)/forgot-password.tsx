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
	Card,
	CardHeader,
	CardContent,
	CardFooter,
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
		<Screen>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.container}>
					<Card style={styles.card}>
						<CardHeader>
							<Text style={styles.title}>Reset your password</Text>
							<Text style={styles.subtitle}>
								Enter your email address and we'll send you a link to reset your
								password.
							</Text>
						</CardHeader>

						<CardContent>
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
						</CardContent>

						<CardFooter>
							<View style={styles.footer}>
								<Text style={styles.footerText}>Remember your password? </Text>
								<TouchableOpacity onPress={handleBackToSignIn}>
									<Text style={styles.footerLinkText}>Back to sign in</Text>
								</TouchableOpacity>
							</View>
						</CardFooter>
					</Card>
				</View>
			</ScrollView>
		</Screen>
	)
}

const styles = StyleSheet.create({
	scrollContainer: {
		flexGrow: 1,
	},
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: 20,
	},
	card: {
		maxWidth: 400,
		alignSelf: 'center',
		width: '100%',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 8,
		color: '#1a1a1a',
	},
	subtitle: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
		marginBottom: 24,
		lineHeight: 22,
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
		paddingTop: 16,
	},
	footerText: {
		fontSize: 14,
		color: '#6b7280',
	},
	footerLinkText: {
		fontSize: 14,
		color: '#3b82f6',
		fontWeight: '600',
	},
})
