import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { TokenData } from '../../types'
import { StorageError, StorageKeys } from './types'

// Web fallback using localStorage (less secure but functional for development)
const WebStorage = {
  async setItemAsync(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value)
    }
  },
  
  async getItemAsync(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key)
    }
    return null
  },
  
  async deleteItemAsync(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key)
    }
  }
}

/**
 * SecureStorage class provides a wrapper around Expo SecureStore
 * for managing authentication-related data securely on the device
 */
export class SecureStorage {
  private static instance: SecureStorage
  
  private constructor() {}
  
  /**
   * Get singleton instance of SecureStorage
   */
  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage()
    }
    return SecureStorage.instance
  }

  /**
   * Store token data securely
   * @param tokens - Token data to store
   */
  async storeTokens(tokens: TokenData): Promise<void> {
    try {
      const tokensJson = JSON.stringify(tokens)
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      await storage.setItemAsync(StorageKeys.TOKEN_DATA, tokensJson)
    } catch (_error) {
      throw this.createStorageError('Failed to store token data', 'STORAGE_ERROR', _error)
    }
  }

  /**
   * Retrieve token data from secure storage
   * @returns Token data or null if not found
   */
  async getTokens(): Promise<TokenData | null> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      const tokensJson = await storage.getItemAsync(StorageKeys.TOKEN_DATA)
      if (!tokensJson) {
        return null
      }
      return JSON.parse(tokensJson) as TokenData
    } catch (_error) {
      if (_error instanceof SyntaxError) {
        // Invalid JSON, clear corrupted data
        await this.clearTokens()
        return null
      }
      throw this.createStorageError('Failed to retrieve token data', 'DECRYPTION_ERROR', _error)
    }
  }

  /**
   * Clear token data from secure storage
   */
  async clearTokens(): Promise<void> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      await storage.deleteItemAsync(StorageKeys.TOKEN_DATA)
    } catch (_error) {
      // Don't throw error if key doesn't exist
      if (_error instanceof Error && !_error.message.includes('not found')) {
        throw this.createStorageError('Failed to clear token data', 'STORAGE_ERROR', _error)
      }
    }
  }

  /**
   * Store user data securely
   * @param user - User data to store
   */
  async storeUser(user: any): Promise<void> {
    try {
      const userJson = JSON.stringify(user)
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      await storage.setItemAsync(StorageKeys.USER_DATA, userJson)
    } catch (_error) {
      throw this.createStorageError('Failed to store user data', 'STORAGE_ERROR', _error)
    }
  }

  /**
   * Retrieve user data from secure storage
   * @returns User data or null if not found
   */
  async getUser(): Promise<any | null> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      const userJson = await storage.getItemAsync(StorageKeys.USER_DATA)
      if (!userJson) {
        return null
      }
      return JSON.parse(userJson)
    } catch (_error) {
      if (_error instanceof SyntaxError) {
        // Invalid JSON, clear corrupted data
        await this.clearUser()
        return null
      }
      throw this.createStorageError('Failed to retrieve user data', 'DECRYPTION_ERROR', _error)
    }
  }

  /**
   * Clear user data from secure storage
   */
  async clearUser(): Promise<void> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      await storage.deleteItemAsync(StorageKeys.USER_DATA)
    } catch (_error) {
      // Don't throw error if key doesn't exist
      if (_error instanceof Error && !_error.message.includes('not found')) {
        throw this.createStorageError('Failed to clear user data', 'STORAGE_ERROR', _error)
      }
    }
  }



  /**
   * Store user preferences
   * @param preferences - User preferences object
   */
  async storeUserPreferences(preferences: Record<string, any>): Promise<void> {
    try {
      const preferencesJson = JSON.stringify(preferences)
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      await storage.setItemAsync(StorageKeys.USER_PREFERENCES, preferencesJson)
    } catch (error) {
      throw this.createStorageError('Failed to store user preferences', 'STORAGE_ERROR', error)
    }
  }

  /**
   * Retrieve user preferences
   * @returns User preferences object or null if not found
   */
  async getUserPreferences(): Promise<Record<string, any> | null> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      const preferencesJson = await storage.getItemAsync(StorageKeys.USER_PREFERENCES)
      if (!preferencesJson) {
        return null
      }
      return JSON.parse(preferencesJson)
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Invalid JSON, clear corrupted data
        await this.clearUserPreferences()
        return null
      }
      throw this.createStorageError('Failed to retrieve user preferences', 'DECRYPTION_ERROR', error)
    }
  }

  /**
   * Clear user preferences from secure storage
   */
  async clearUserPreferences(): Promise<void> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      await storage.deleteItemAsync(StorageKeys.USER_PREFERENCES)
    } catch (error) {
      // Don't throw error if key doesn't exist
      if (error instanceof Error && !error.message.includes('not found')) {
        throw this.createStorageError('Failed to clear user preferences', 'STORAGE_ERROR', error)
      }
    }
  }

  /**
   * Check if biometric authentication is enabled
   * @returns Boolean indicating if biometric auth is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      const enabled = await storage.getItemAsync(StorageKeys.BIOMETRIC_ENABLED)
      return enabled === 'true'
    } catch {
      return false
    }
  }

  /**
   * Set biometric authentication preference
   * @param enabled - Whether biometric auth should be enabled
   */
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      await storage.setItemAsync(StorageKeys.BIOMETRIC_ENABLED, enabled.toString())
    } catch (_error) {
      throw this.createStorageError('Failed to set biometric preference', 'STORAGE_ERROR', _error)
    }
  }

  /**
   * Clear all stored data (useful for logout)
   */
  async clearAll(): Promise<void> {
    const clearOperations = [
      this.clearTokens(),
      this.clearUser(),
      this.clearUserPreferences()
    ]
    
    try {
      await Promise.all(clearOperations)
    } catch (_error) {
      throw this.createStorageError('Failed to clear all data', 'STORAGE_ERROR', _error)
    }
  }

  /**
   * Check if a specific key exists in storage
   * @param key - Storage key to check
   * @returns Boolean indicating if key exists
   */
  async hasKey(key: StorageKeys): Promise<boolean> {
    try {
      const storage = Platform.OS === 'web' ? WebStorage : SecureStore
      const value = await storage.getItemAsync(key)
      return value !== null
    } catch {
      return false
    }
  }

  /**
   * Create a standardized storage error
   * @param message - Error message
   * @param code - Error code
   * @param originalError - Original error that caused this
   * @returns StorageError instance
   */
  private createStorageError(
    message: string, 
    code: StorageError['code'], 
    originalError?: unknown
  ): StorageError {
    const error = new Error(message) as StorageError
    error.code = code
    error.name = 'StorageError'
    
    if (originalError instanceof Error) {
      error.stack = originalError.stack
      error.cause = originalError
    }
    
    return error
  }
}