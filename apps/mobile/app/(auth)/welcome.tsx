import React from 'react'
import {
	StyleSheet,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Screen, Button } from '../../components/ui'

const { width, height } = Dimensions.get('window')

export default function WelcomeScreen() {
	const router = useRouter()

	const handleGetStarted = () => {
		router.push('/(auth)/sign-up')
	}

	const handleSignIn = () => {
		router.push('/(auth)/sign-in')
	}

	return (
		<Screen style={styles.container}>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Hero Section */}
				<View style={styles.hero}>
					<View style={styles.logoContainer}>
						<Text style={styles.logoEmoji}>🚀</Text>
					</View>
					<Text style={styles.title}>
						Welcome to{'\n'}
						<Text style={styles.brandText}>Epic Stack</Text>
					</Text>
					<Text style={styles.subtitle}>
						The fastest way to build and ship production-ready apps
					</Text>
				</View>

				{/* Features Grid */}
				<View style={styles.featuresGrid}>
					<FeatureCard
						icon="⚡"
						title="Fast Development"
						description="Pre-configured tools and patterns"
					/>
					<FeatureCard
						icon="🔒"
						title="Secure"
						description="Built-in authentication & security"
					/>
					<FeatureCard
						icon="📱"
						title="Mobile First"
						description="Optimized for mobile experience"
					/>
					<FeatureCard
						icon="🎨"
						title="Beautiful UI"
						description="Modern design system included"
					/>
				</View>

				{/* CTA Section */}
				<View style={styles.ctaSection}>
					<Button onPress={handleGetStarted} style={styles.primaryButton}>
						Get Started
					</Button>

					<View style={styles.signInContainer}>
						<Text style={styles.signInText}>Already have an account? </Text>
						<TouchableOpacity onPress={handleSignIn}>
							<Text style={styles.signInLink}>Sign In</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
		</Screen>
	)
}

interface FeatureCardProps {
	icon: string
	title: string
	description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
	return (
		<View style={styles.featureCard}>
			<Text style={styles.featureIcon}>{icon}</Text>
			<Text style={styles.featureTitle}>{title}</Text>
			<Text style={styles.featureDescription}>{description}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#f8fafc',
	},
	scrollContainer: {
		flexGrow: 1,
		paddingHorizontal: 24,
	},
	hero: {
		alignItems: 'center',
		paddingTop: height * 0.1,
		paddingBottom: 48,
	},
	logoContainer: {
		width: 100,
		height: 100,
		backgroundColor: '#667eea',
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 32,
		shadowColor: '#667eea',
		shadowOffset: {
			width: 0,
			height: 8,
		},
		shadowOpacity: 0.3,
		shadowRadius: 16,
		elevation: 8,
	},
	logoEmoji: {
		fontSize: 48,
	},
	title: {
		fontSize: 32,
		fontWeight: '700',
		color: '#1a202c',
		textAlign: 'center',
		marginBottom: 16,
		lineHeight: 40,
	},
	brandText: {
		color: '#667eea',
	},
	subtitle: {
		fontSize: 18,
		color: '#64748b',
		textAlign: 'center',
		lineHeight: 26,
		paddingHorizontal: 16,
	},
	featuresGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		marginBottom: 48,
	},
	featureCard: {
		width: (width - 64) / 2,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 20,
		marginBottom: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	featureIcon: {
		fontSize: 32,
		marginBottom: 12,
	},
	featureTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a202c',
		marginBottom: 8,
		textAlign: 'center',
	},
	featureDescription: {
		fontSize: 14,
		color: '#64748b',
		textAlign: 'center',
		lineHeight: 20,
	},
	ctaSection: {
		paddingBottom: 32,
	},
	primaryButton: {
		marginBottom: 24,
	},
	signInContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
	},
	signInText: {
		fontSize: 16,
		color: '#64748b',
	},
	signInLink: {
		fontSize: 16,
		color: '#667eea',
		fontWeight: '600',
	},
})