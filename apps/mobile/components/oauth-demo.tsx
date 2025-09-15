import React, { useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { SocialButton, Button, ErrorText } from './ui'
import { useOAuth, useOAuthProviders } from '../lib/auth/hooks/use-oauth'
import { useAuth } from '../lib/auth/hooks/use-auth'

/**
 * Demo component showing OAuth authentication flow
 * This demonstrates how to integrate OAuth in mobile screens
 */
export function OAuthDemo() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const { user, isAuthenticated, logout } = useAuth()
  const { configuredProviders, getProviderInfo } = useOAuthProviders()
  
  const { 
    authenticate, 
    isLoading, 
    error, 
    clearError 
  } = useOAuth({
    onSuccess: (result) => {
      Alert.alert(
        'OAuth Success', 
        `Successfully authenticated with ${selectedProvider}!`,
        [{ text: 'OK', onPress: () => setSelectedProvider(null) }]
      )
    },
    onError: (error) => {
      Alert.alert(
        'OAuth Error', 
        error,
        [{ text: 'OK', onPress: clearError }]
      )
    },
  })

  const handleOAuthLogin = async (provider: string) => {
    setSelectedProvider(provider)
    clearError()
    await authenticate(provider)
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout 
        },
      ]
    )
  }

  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.subtitle}>You are logged in as:</Text>
        
        <View style={styles.userInfo}>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          {user.name && <Text style={styles.name}>{user.name}</Text>}
        </View>

        <Button 
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        >
          Logout
        </Button>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OAuth Demo</Text>
      <Text style={styles.subtitle}>
        Choose a provider to authenticate with:
      </Text>

      {error && (
        <ErrorText style={styles.error}>
          {error}
        </ErrorText>
      )}

      <View style={styles.providersContainer}>
        {configuredProviders.length > 0 ? (
          configuredProviders.map((provider) => {
            const providerInfo = getProviderInfo(provider)
            return (
              <SocialButton
                key={provider}
                provider={provider as 'github' | 'google'}
                type="login"
                onPress={() => handleOAuthLogin(provider)}
                disabled={isLoading}
                loading={isLoading && selectedProvider === provider}
              />
            )
          })
        ) : (
          <View style={styles.noProviders}>
            <Text style={styles.noProvidersText}>
              No OAuth providers configured
            </Text>
            <Text style={styles.noProvidersSubtext}>
              Please set EXPO_PUBLIC_GITHUB_CLIENT_ID or EXPO_PUBLIC_GOOGLE_CLIENT_ID 
              in your environment variables
            </Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Available Providers:</Text>
        {configuredProviders.map((provider) => {
          const info = getProviderInfo(provider)
          return (
            <Text key={provider} style={styles.infoText}>
              • {info?.displayName} {info?.isConfigured ? '✅' : '❌'}
            </Text>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
  },
  error: {
    marginBottom: 16,
    textAlign: 'center',
  },
  providersContainer: {
    marginBottom: 32,
  },
  noProviders: {
    padding: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  noProvidersText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 8,
  },
  noProvidersSubtext: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    lineHeight: 20,
  },
  userInfo: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    color: '#374151',
  },
  logoutButton: {
    marginTop: 16,
  },
  infoContainer: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
})

/**
 * Example usage in a screen:
 * 
 * ```tsx
 * import { OAuthDemo } from '../components/oauth-demo'
 * 
 * export default function OAuthTestScreen() {
 *   return <OAuthDemo />
 * }
 * ```
 */