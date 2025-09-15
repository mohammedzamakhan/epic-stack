import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useOAuthCallback } from '../../lib/auth/hooks/use-oauth'
import { Screen, Button, ErrorText } from '../../components/ui'

/**
 * OAuth callback screen that handles OAuth redirects
 * This screen is called when the user returns from OAuth provider authentication
 */
export default function OAuthCallbackScreen() {
  const { code, state, error, provider } = useLocalSearchParams<{
    code?: string
    state?: string
    error?: string
    provider?: string
  }>()
  
  const [callbackError, setCallbackError] = useState<string | null>(null)
  const { handleCallback, isProcessing } = useOAuthCallback()

  useEffect(() => {
    const processCallback = async () => {
      // Check for OAuth errors first
      if (error) {
        setCallbackError(`OAuth error: ${error}`)
        return
      }

      // Validate required parameters
      if (!code || !provider) {
        setCallbackError('Missing required OAuth parameters')
        return
      }

      try {
        // Construct the callback URL
        const callbackUrl = `epicnotes://auth/callback?code=${code}&state=${state || ''}`
        
        // Handle the OAuth callback
        const result = await handleCallback(callbackUrl, provider)
        
        if (result.success) {
          // Success! The auth context will handle navigation
          // We can navigate to a success screen or let the auth guard handle it
          router.replace('/')
        } else {
          setCallbackError(result.error || 'OAuth authentication failed')
        }
      } catch (err) {
        setCallbackError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    }

    void processCallback()
  }, [code, state, error, provider, handleCallback])

  const handleRetry = () => {
    setCallbackError(null)
    router.replace('/(auth)/sign-in')
  }

  const handleGoHome = () => {
    router.replace('/')
  }

  if (isProcessing) {
    return (
      <Screen backgroundColor="#ffffff">
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.title}>Completing Authentication</Text>
          <Text style={styles.subtitle}>
            Please wait while we complete your authentication...
          </Text>
        </View>
      </Screen>
    )
  }

  if (callbackError) {
    return (
      <Screen style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.title}>Authentication Failed</Text>
          <ErrorText style={styles.error}>
            {callbackError}
          </ErrorText>
          
          <View style={styles.buttonContainer}>
            <Button 
              onPress={handleRetry}
              style={styles.button}
            >
              Try Again
            </Button>
            <Button 
              onPress={handleGoHome}
              variant="outline"
              style={styles.button}
            >
              Go Home
            </Button>
          </View>
        </View>
      </Screen>
    )
  }

  // This should not be reached as the effect should handle all cases
  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.title}>Processing...</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  error: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    marginBottom: 12,
  },
})