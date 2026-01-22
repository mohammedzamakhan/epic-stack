import { Ionicons } from '@expo/vector-icons'
import { Trans } from '@lingui/react/macro'
import { useLingui } from '@lingui/react/macro'
import React from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { Screen, Card, Divider } from '../../../components/ui'

interface SecurityItemProps {
	icon: keyof typeof Ionicons.glyphMap
	label: string
	description: string
	onPress: () => void
}

function SecurityItem({
	icon,
	label,
	description,
	onPress,
}: SecurityItemProps) {
	return (
		<TouchableOpacity onPress={onPress} className="flex-row items-center py-3">
			<View className="bg-muted h-10 w-10 items-center justify-center rounded-full">
				<Ionicons name={icon} size={20} color="#888" />
			</View>
			<View className="ml-3 flex-1">
				<Text className="text-foreground text-base font-medium">{label}</Text>
				<Text className="text-muted-foreground text-sm">{description}</Text>
			</View>
			<Ionicons name="chevron-forward" size={18} color="#888" />
		</TouchableOpacity>
	)
}

export default function SecurityScreen() {
	const { t } = useLingui()

	const handleChangePassword = () => {
		Alert.alert(
			t`Change Password`,
			t`Password change functionality will be available soon.`,
			[{ text: t`OK` }],
		)
	}

	const handleTwoFactor = () => {
		Alert.alert(
			t`Two-Factor Authentication`,
			t`Two-factor authentication setup will be available soon.`,
			[{ text: t`OK` }],
		)
	}

	const handleSessions = () => {
		Alert.alert(
			t`Active Sessions`,
			t`Session management will be available soon.`,
			[{ text: t`OK` }],
		)
	}

	return (
		<Screen>
			<View className="flex-1 p-4">
				<Card>
					<View className="px-4 pt-4 pb-1">
						<Text className="text-muted-foreground text-xs font-medium uppercase">
							<Trans>Authentication</Trans>
						</Text>
					</View>
					<View className="px-4">
						<SecurityItem
							icon="key-outline"
							label={t`Change Password`}
							description={t`Update your account password`}
							onPress={handleChangePassword}
						/>
						<Divider />
						<SecurityItem
							icon="phone-portrait-outline"
							label={t`Two-Factor Authentication`}
							description={t`Add an extra layer of security`}
							onPress={handleTwoFactor}
						/>
					</View>
				</Card>

				<Card className="mt-4">
					<View className="px-4 pt-4 pb-1">
						<Text className="text-muted-foreground text-xs font-medium uppercase">
							<Trans>Sessions</Trans>
						</Text>
					</View>
					<View className="px-4">
						<SecurityItem
							icon="desktop-outline"
							label={t`Active Sessions`}
							description={t`Manage your logged-in devices`}
							onPress={handleSessions}
						/>
					</View>
				</Card>
			</View>
		</Screen>
	)
}
