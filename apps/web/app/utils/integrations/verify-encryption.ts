/**
 * Simple verification script for encryption functionality
 * Run with: npx tsx apps/web/app/utils/integrations/verify-encryption.ts
 */

import { IntegrationEncryptionService, generateNewEncryptionKey } from './encryption'
import type { TokenData } from './types'

async function verifyEncryption() {
  console.log('🔐 Verifying Integration Encryption Service...\n')

  // Generate a test encryption key
  const testKey = generateNewEncryptionKey()
  console.log('✅ Generated encryption key:', testKey.substring(0, 16) + '...')

  // Set the key in environment
  process.env.INTEGRATION_ENCRYPTION_KEY = testKey

  // Create encryption service instance
  const encryptionService = new IntegrationEncryptionService()

  // Test token data
  const originalTokenData: TokenData = {
    accessToken: 'test-access-token-12345',
    refreshToken: 'test-refresh-token-67890',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    scope: 'read write',
  }

  try {
    // Test encryption
    console.log('\n📝 Original token data:')
    console.log('  Access Token:', originalTokenData.accessToken)
    console.log('  Refresh Token:', originalTokenData.refreshToken)
    console.log('  Expires At:', originalTokenData.expiresAt?.toISOString())
    console.log('  Scope:', originalTokenData.scope)

    const encryptedData = await encryptionService.encryptTokenData(originalTokenData)
    console.log('\n🔒 Encrypted token data:')
    console.log('  Encrypted Access Token:', encryptedData.encryptedAccessToken.substring(0, 32) + '...')
    console.log('  Encrypted Refresh Token:', encryptedData.encryptedRefreshToken?.substring(0, 32) + '...')
    console.log('  IV:', encryptedData.iv)
    console.log('  Expires At:', encryptedData.expiresAt?.toISOString())
    console.log('  Scope:', encryptedData.scope)

    // Test decryption
    const decryptedData = await encryptionService.decryptTokenData(encryptedData)
    console.log('\n🔓 Decrypted token data:')
    console.log('  Access Token:', decryptedData.accessToken)
    console.log('  Refresh Token:', decryptedData.refreshToken)
    console.log('  Expires At:', decryptedData.expiresAt?.toISOString())
    console.log('  Scope:', decryptedData.scope)

    // Verify data integrity
    const isValid = 
      decryptedData.accessToken === originalTokenData.accessToken &&
      decryptedData.refreshToken === originalTokenData.refreshToken &&
      decryptedData.expiresAt?.getTime() === originalTokenData.expiresAt?.getTime() &&
      decryptedData.scope === originalTokenData.scope

    if (isValid) {
      console.log('\n✅ Encryption/Decryption verification PASSED')
    } else {
      console.log('\n❌ Encryption/Decryption verification FAILED')
      return false
    }

    // Test token validation
    console.log('\n🔍 Testing token validation...')
    
    // Valid token
    const validResult = encryptionService.validateToken(originalTokenData)
    console.log('  Valid token result:', validResult)

    // Expired token
    const expiredTokenData: TokenData = {
      ...originalTokenData,
      expiresAt: new Date('2020-01-01T00:00:00Z'),
    }
    const expiredResult = encryptionService.validateToken(expiredTokenData)
    console.log('  Expired token result:', expiredResult)

    // Token needing refresh
    const refreshTokenData: TokenData = {
      ...originalTokenData,
      expiresAt: new Date(Date.now() + 120000), // 2 minutes from now
    }
    const refreshResult = encryptionService.validateToken(refreshTokenData)
    console.log('  Token needing refresh result:', refreshResult)

    // Test OAuth state generation
    console.log('\n🔐 Testing OAuth state generation...')
    const state = encryptionService.generateOAuthState('org-123', 'slack')
    console.log('  Generated state:', state)

    const parsedState = encryptionService.validateOAuthState(state)
    console.log('  Parsed state:', parsedState)

    console.log('\n🎉 All encryption utilities verified successfully!')
    return true

  } catch (error) {
    console.error('\n❌ Encryption verification failed:', error)
    return false
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyEncryption()
    .then((success) => {
      process.exit(success ? 0 : 1)
    })
    .catch((error) => {
      console.error('Verification script failed:', error)
      process.exit(1)
    })
}

export { verifyEncryption }