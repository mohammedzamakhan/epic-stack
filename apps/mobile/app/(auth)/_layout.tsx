import { Stack } from 'expo-router'

export default function AuthLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="sign-in"
				options={{
					title: 'Sign In',
					gestureEnabled: true,
				}}
			/>
			<Stack.Screen
				name="sign-up"
				options={{
					title: 'Sign Up',
					gestureEnabled: true,
				}}
			/>
			<Stack.Screen
				name="forgot-password"
				options={{
					title: 'Forgot Password',
					gestureEnabled: true,
				}}
			/>
			<Stack.Screen
				name="verify-email"
				options={{
					title: 'Verify Email',
					gestureEnabled: true,
				}}
			/>
		</Stack>
	)
}
