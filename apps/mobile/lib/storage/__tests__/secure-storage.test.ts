import * as SecureStore from 'expo-secure-store'
import { SecureStorage } from '../secure-storage'
import { StorageKeys } from '../types'
import { TokenData } from '../../../types'

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

describe('SecureStorage', () => {
  let storage: SecureStorage

  beforeEach(() => {
    storage = SecureStorage.getInstance()
    jest.clearAllMocks()
  })

  describe('Token Management', () => {
    const mockTokens: TokenData = {
      accessToken: 'access_token_123',
      refreshToken: 'refresh_token_123',
      expiresIn: 3600,
      expiresAt: '2023-12-31T23:59:59Z',
    }

    describe('storeTokens', () => {
      it('should store token data successfully', async () => {
        mockSecureStore.setItemAsync.mockResolvedValue()

        await storage.storeTokens(mockTokens)

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          StorageKeys.TOKEN_DATA,
          JSON.stringify(mockTokens)
        )
      })

      it('should throw error when storage fails', async () => {
        const error = new Error('Storage failed')
        mockSecureStore.setItemAsync.mockRejectedValue(error)

        await expect(storage.storeTokens(mockTokens)).rejects.toMatchObject({
          message: 'Failed to store token data',
          code: 'STORAGE_ERROR'
        })
      })
    })

    describe('getTokens', () => {
      it('should retrieve token data successfully', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockTokens))

        const result = await storage.getTokens()

        expect(result).toEqual(mockTokens)
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(StorageKeys.TOKEN_DATA)
      })

      it('should return null when no tokens exist', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(null)

        const result = await storage.getTokens()

        expect(result).toBeNull()
      })

      it('should clear corrupted token data and return null', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue('invalid json')
        mockSecureStore.deleteItemAsync.mockResolvedValue()

        const result = await storage.getTokens()

        expect(result).toBeNull()
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.TOKEN_DATA)
      })

      it('should throw error when retrieval fails', async () => {
        const error = new Error('Retrieval failed')
        mockSecureStore.getItemAsync.mockRejectedValue(error)

        await expect(storage.getTokens()).rejects.toMatchObject({
          message: 'Failed to retrieve token data',
          code: 'DECRYPTION_ERROR'
        })
      })
    })

    describe('clearTokens', () => {
      it('should clear token data successfully', async () => {
        mockSecureStore.deleteItemAsync.mockResolvedValue()

        await storage.clearTokens()

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.TOKEN_DATA)
      })

      it('should not throw error when key does not exist', async () => {
        const error = new Error('Key not found')
        mockSecureStore.deleteItemAsync.mockRejectedValue(error)

        await expect(storage.clearTokens()).resolves.toBeUndefined()
      })

      it('should throw error when clear fails', async () => {
        const error = new Error('Clear failed')
        mockSecureStore.deleteItemAsync.mockRejectedValue(error)

        await expect(storage.clearTokens()).rejects.toMatchObject({
          message: 'Failed to clear token data',
          code: 'STORAGE_ERROR'
        })
      })
    })
  })

  describe('User Management', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
    }

    describe('storeUser', () => {
      it('should store user data successfully', async () => {
        mockSecureStore.setItemAsync.mockResolvedValue()

        await storage.storeUser(mockUser)

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          StorageKeys.USER_DATA,
          JSON.stringify(mockUser)
        )
      })

      it('should throw error when storage fails', async () => {
        const error = new Error('Storage failed')
        mockSecureStore.setItemAsync.mockRejectedValue(error)

        await expect(storage.storeUser(mockUser)).rejects.toMatchObject({
          message: 'Failed to store user data',
          code: 'STORAGE_ERROR'
        })
      })
    })

    describe('getUser', () => {
      it('should retrieve user data successfully', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockUser))

        const result = await storage.getUser()

        expect(result).toEqual(mockUser)
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(StorageKeys.USER_DATA)
      })

      it('should return null when no user exists', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(null)

        const result = await storage.getUser()

        expect(result).toBeNull()
      })

      it('should clear corrupted user data and return null', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue('invalid json')
        mockSecureStore.deleteItemAsync.mockResolvedValue()

        const result = await storage.getUser()

        expect(result).toBeNull()
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.USER_DATA)
      })

      it('should throw error when retrieval fails', async () => {
        const error = new Error('Retrieval failed')
        mockSecureStore.getItemAsync.mockRejectedValue(error)

        await expect(storage.getUser()).rejects.toMatchObject({
          message: 'Failed to retrieve user data',
          code: 'DECRYPTION_ERROR'
        })
      })
    })

    describe('clearUser', () => {
      it('should clear user data successfully', async () => {
        mockSecureStore.deleteItemAsync.mockResolvedValue()

        await storage.clearUser()

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.USER_DATA)
      })
    })
  })

  describe('User Preferences Management', () => {
    const mockPreferences = {
      theme: 'dark',
      notifications: true,
      language: 'en',
    }

    describe('storeUserPreferences', () => {
      it('should store preferences successfully', async () => {
        mockSecureStore.setItemAsync.mockResolvedValue()

        await storage.storeUserPreferences(mockPreferences)

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          StorageKeys.USER_PREFERENCES,
          JSON.stringify(mockPreferences)
        )
      })
    })

    describe('getUserPreferences', () => {
      it('should retrieve preferences successfully', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(mockPreferences))

        const result = await storage.getUserPreferences()

        expect(result).toEqual(mockPreferences)
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(StorageKeys.USER_PREFERENCES)
      })

      it('should return null when no preferences exist', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(null)

        const result = await storage.getUserPreferences()

        expect(result).toBeNull()
      })
    })

    describe('clearUserPreferences', () => {
      it('should clear preferences successfully', async () => {
        mockSecureStore.deleteItemAsync.mockResolvedValue()

        await storage.clearUserPreferences()

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.USER_PREFERENCES)
      })
    })
  })

  describe('Biometric Settings', () => {
    describe('setBiometricEnabled', () => {
      it('should enable biometric authentication', async () => {
        mockSecureStore.setItemAsync.mockResolvedValue()

        await storage.setBiometricEnabled(true)

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          StorageKeys.BIOMETRIC_ENABLED,
          'true'
        )
      })

      it('should disable biometric authentication', async () => {
        mockSecureStore.setItemAsync.mockResolvedValue()

        await storage.setBiometricEnabled(false)

        expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
          StorageKeys.BIOMETRIC_ENABLED,
          'false'
        )
      })
    })

    describe('isBiometricEnabled', () => {
      it('should return true when biometric is enabled', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue('true')

        const result = await storage.isBiometricEnabled()

        expect(result).toBe(true)
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(StorageKeys.BIOMETRIC_ENABLED)
      })

      it('should return false when biometric is disabled', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue('false')

        const result = await storage.isBiometricEnabled()

        expect(result).toBe(false)
      })

      it('should return false when no setting exists', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(null)

        const result = await storage.isBiometricEnabled()

        expect(result).toBe(false)
      })

      it('should return false when retrieval fails', async () => {
        mockSecureStore.getItemAsync.mockRejectedValue(new Error('Retrieval failed'))

        const result = await storage.isBiometricEnabled()

        expect(result).toBe(false)
      })
    })
  })

  describe('Utility Methods', () => {
    describe('clearAll', () => {
      it('should clear all stored data', async () => {
        mockSecureStore.deleteItemAsync.mockResolvedValue()

        await storage.clearAll()

        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledTimes(3)
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.TOKEN_DATA)
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.USER_DATA)
        expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(StorageKeys.USER_PREFERENCES)
      })
    })

    describe('hasKey', () => {
      it('should return true when key exists', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue('some value')

        const result = await storage.hasKey(StorageKeys.TOKEN_DATA)

        expect(result).toBe(true)
      })

      it('should return false when key does not exist', async () => {
        mockSecureStore.getItemAsync.mockResolvedValue(null)

        const result = await storage.hasKey(StorageKeys.TOKEN_DATA)

        expect(result).toBe(false)
      })

      it('should return false when check fails', async () => {
        mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'))

        const result = await storage.hasKey(StorageKeys.TOKEN_DATA)

        expect(result).toBe(false)
      })
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SecureStorage.getInstance()
      const instance2 = SecureStorage.getInstance()

      expect(instance1).toBe(instance2)
    })
  })
})