import React from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { router } from 'expo-router'
import {
	Screen,
	Card,
	CardHeader,
	CardContent,
	Button,
} from '../../components/ui'
import { useAuth } from '../../lib/auth/hooks/use-auth'
import { useOrganizations } from '../../lib/api/hooks/use-organizations'

export default function DashboardScreen() {
	const { user, logout, isLoading } = useAuth()
	const {
		organizations,
		isLoading: organizationsLoading,
		error: organizationsError,
	} = useOrganizations()

	console.log(organizations)
	const handleLogout = async () => {
		await logout()
		router.replace('/(auth)/sign-in')
		Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
			{
				text: 'Cancel',
				style: 'cancel',
			},
			{
				text: 'Sign Out',
				style: 'destructive',
				onPress: async () => {
					try {
						await logout()
						router.replace('/(auth)/sign-in')
					} catch (error) {
						console.error('Logout error:', error)
					}
				},
			},
		])
	}

	const handleEditProfile = () => {
		Alert.alert(
			'Edit Profile',
			'Profile editing functionality will be available soon.',
			[{ text: 'OK' }],
		)
	}

	if (!user) {
		return (
			<Screen>
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Loading...</Text>
				</View>
			</Screen>
		)
	}

	return (
		<Screen>
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.container}>
					{/* Header */}
					<View style={styles.header}>
						<Text style={styles.welcomeText}>Welcome back!</Text>
						<Text style={styles.nameText}>{user.name || user.username}</Text>
					</View>

					{/* User Info Card */}
					<Card style={styles.card}>
						<CardHeader>
							<Text style={styles.cardTitle}>Profile Information</Text>
						</CardHeader>
						<CardContent>
							<View style={styles.infoRow}>
								<Text style={styles.infoLabel}>Username:</Text>
								<Text style={styles.infoValue}>{user.username}</Text>
							</View>
							<View style={styles.infoRow}>
								<Text style={styles.infoLabel}>Email:</Text>
								<Text style={styles.infoValue}>{user.email}</Text>
							</View>
							{user.name && (
								<View style={styles.infoRow}>
									<Text style={styles.infoLabel}>Name:</Text>
									<Text style={styles.infoValue}>{user.name}</Text>
								</View>
							)}
							<View style={styles.infoRow}>
								<Text style={styles.infoLabel}>Member since:</Text>
								<Text style={styles.infoValue}>
									{new Date(user.createdAt).toLocaleDateString()}
								</Text>
							</View>
						</CardContent>
					</Card>

					{/* Organizations Card */}
					<Card style={styles.card}>
						<CardHeader>
							<Text style={styles.cardTitle}>Organizations</Text>
						</CardHeader>
						<CardContent>
							{organizationsLoading ? (
								<Text style={styles.loadingText}>Loading organizations...</Text>
							) : organizationsError ? (
								<Text style={styles.errorText}>{organizationsError}</Text>
							) : organizations && organizations.length === 0 ? (
								<Text style={styles.emptyText}>No organizations found</Text>
							) : (
								<View>
									{organizations &&
										organizations.map((org, index) => (
											<View
												key={org.id}
												style={[
													styles.orgRow,
													index === organizations.length - 1 &&
														styles.lastOrgRow,
												]}
											>
												<View style={styles.orgInfo}>
													<View style={styles.orgHeader}>
														<Text style={styles.orgName}>{org.name}</Text>
														{org.isDefault && (
															<View style={styles.defaultBadge}>
																<Text style={styles.defaultBadgeText}>
																	Default
																</Text>
															</View>
														)}
													</View>
													<Text style={styles.orgRole}>{org.role.name}</Text>
													{org.description && (
														<Text style={styles.orgDescription}>
															{org.description}
														</Text>
													)}
													<View style={styles.orgMeta}>
														<Text style={styles.orgMetaText}>
															Joined{' '}
															{new Date(org.joinedAt).toLocaleDateString()}
														</Text>
														{org.size && (
															<Text style={styles.orgMetaText}>
																{' '}
																• {org.size}
															</Text>
														)}
													</View>
												</View>
											</View>
										))}
								</View>
							)}
						</CardContent>
					</Card>

					{/* Actions Card */}
					<Card style={styles.card}>
						<CardHeader>
							<Text style={styles.cardTitle}>Account Actions</Text>
						</CardHeader>
						<CardContent>
							<View style={styles.actionsContainer}>
								<Button
									variant="outline"
									onPress={handleEditProfile}
									style={styles.actionButton}
								>
									Edit Profile
								</Button>
								<Button
									variant="outline"
									onPress={handleLogout}
									loading={isLoading}
									style={styles.actionButton}
								>
									Sign Out
								</Button>
							</View>
						</CardContent>
					</Card>

					{/* App Info Card */}
					<Card style={styles.card}>
						<CardHeader>
							<Text style={styles.cardTitle}>Epic Stack Mobile</Text>
						</CardHeader>
						<CardContent>
							<Text style={styles.appDescription}>
								You're successfully logged into the Epic Stack mobile app! This
								is a React Native app built with Expo Router and integrated with
								the Epic Stack backend.
							</Text>
							<View style={styles.featuresContainer}>
								<Text style={styles.featuresTitle}>Features:</Text>
								<Text style={styles.featureItem}>• Secure authentication</Text>
								<Text style={styles.featureItem}>• Session management</Text>
								<Text style={styles.featureItem}>• Cross-platform support</Text>
								<Text style={styles.featureItem}>• Modern UI components</Text>
							</View>
						</CardContent>
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
		padding: 20,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 16,
		color: '#666',
	},
	header: {
		marginBottom: 24,
		alignItems: 'center',
	},
	welcomeText: {
		fontSize: 18,
		color: '#666',
		marginBottom: 4,
	},
	nameText: {
		fontSize: 28,
		fontWeight: 'bold',
		color: '#1a1a1a',
		textAlign: 'center',
	},
	card: {
		marginBottom: 16,
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: '#1a1a1a',
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	infoLabel: {
		fontSize: 14,
		color: '#6b7280',
		fontWeight: '500',
	},
	infoValue: {
		fontSize: 14,
		color: '#1a1a1a',
		fontWeight: '600',
		flex: 1,
		textAlign: 'right',
	},
	actionsContainer: {
		gap: 12,
	},
	actionButton: {
		width: '100%',
	},
	appDescription: {
		fontSize: 14,
		color: '#6b7280',
		lineHeight: 20,
		marginBottom: 16,
	},
	featuresContainer: {
		marginTop: 8,
	},
	featuresTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 8,
	},
	featureItem: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 4,
	},
	errorText: {
		fontSize: 14,
		color: '#ef4444',
		textAlign: 'center',
		fontStyle: 'italic',
	},
	emptyText: {
		fontSize: 14,
		color: '#6b7280',
		textAlign: 'center',
		fontStyle: 'italic',
	},
	orgRow: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f3f4f6',
	},
	lastOrgRow: {
		borderBottomWidth: 0,
	},
	orgInfo: {
		flex: 1,
	},
	orgHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	orgName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#1a1a1a',
		flex: 1,
	},
	defaultBadge: {
		backgroundColor: '#10b981',
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
	},
	defaultBadgeText: {
		fontSize: 10,
		fontWeight: '600',
		color: 'white',
		textTransform: 'uppercase',
	},
	orgRole: {
		fontSize: 14,
		color: '#6366f1',
		fontWeight: '500',
		marginBottom: 4,
		textTransform: 'capitalize',
	},
	orgDescription: {
		fontSize: 13,
		color: '#6b7280',
		marginBottom: 6,
		lineHeight: 18,
	},
	orgMeta: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	orgMetaText: {
		fontSize: 12,
		color: '#9ca3af',
	},
})
