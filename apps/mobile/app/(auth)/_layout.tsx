import { Stack } from 'expo-router'

export default function AuthLayout() {
	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen
				name="landing"
				options={{
					title: 'Welcome',
					gestureEnabled: false,
				}}
			/>
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
			<Stack.Screen
				name="verify-code"
				options={{
					title: 'Verify Code',
					gestureEnabled: true,
				}}
			/>
			<Stack.Screen
				name="onboarding"
				options={{
					title: 'Onboarding',
					gestureEnabled: true,
				}}
			/>
			<Stack.Screen
				name="welcome"
				options={{
					title: 'Welcome',
					gestureEnabled: false,
				}}
			/>
		</Stack>
	)
}
