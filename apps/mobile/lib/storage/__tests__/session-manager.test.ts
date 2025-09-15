// @ts-nocheck
import { SessionManager } from '../session-manager'
import { SecureStorage } from '../secure-storage'
import { SessionData } from '../../../types'

// Mock SecureStorage
jest.mock('../secure-storage')

// @ts-ignore
const mockSecureStorage = SecureStorage as jest.MockedClass<typeof SecureStorage>
const mockStorageInstance = {
  storeSession: jest.fn(),
  getSession: jest.fn(),
  clearAll: jest.fn(),
  storeRefreshToken: jest.fn(),
  getRefreshToken: jest.fn(),
} as any

describe('SessionManager', () => {
  let sessionManager: SessionManager

  beforeEach(() => {
    jest.clearAllMocks()
    // @ts-ignore
    mockSecureStorage.getInstance.mockReturnValue(mockStorageInstance)
    sessionManager = SessionManager.getInstance()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = SessionManager.getInstance()
      const instance2 = SessionManager.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('Session Validation', () => {
    const mockSession: SessionData = {
      id: 'session456',
      userId: 'user123',
      expirationDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    // @ts-ignore - Test file with mock data
  describe('validateSession', () => {
      it('should return valid session when session exists and not expired', async () => {
        mockStorageInstance.getSession.mockResolvedValue(mockSession)

        const result = await sessionManager.validateSession()

        expect(result).toEqual({
          isValid: true,
          isExpired: false,
          needsRefresh: false,
          session: mockSession
        })
      })

      it('should return invalid when no session exists', async () => {
        mockStorageInstance.getSession.mockResolvedValue(null)

        const result = await sessionManager.validateSession()

        expect(result).toEqual({
          isValid: false,
          isExpired: false,
          needsRefresh: false,
          session: null
        })
      })

      it('should return expired when session is past expiration', async () => {
        const expiredSession: SessionData = {
          ...mockSession,
          expirationDate: new Date(Date.now() - 60 * 1000).toISOString() // 1 minute ago
        }
        mockStorageInstance.getSession.mockResolvedValue(expiredSession)

        const result = await sessionManager.validateSession()

        expect(result).toEqual({
          isValid: false,
          isExpired: true,
          needsRefresh: false,
          session: expiredSession
        })
      })

      it('should return needs refresh when session expires within 5 minutes', async () => {
        const soonToExpireSession: SessionData = {
          ...mockSession,
          expirationDate: new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3 minutes from now
        }
        mockStorageInstance.getSession.mockResolvedValue(soonToExpireSession)

        const result = await sessionManager.validateSession()

        expect(result).toEqual({
          isValid: true,
          isExpired: false,
          needsRefresh: true,
          session: soonToExpireSession
        })
      })

      it('should handle storage errors gracefully', async () => {
        mockStorageInstance.getSession.mockRejectedValue(new Error('Storage error'))

        const result = await sessionManager.validateSession()

        expect(result).toEqual({
          isValid: false,
          isExpired: false,
          needsRefresh: false,
          session: null
        })
      })
    })

    describe('getCurrentSession', () => {
      it('should return session when valid', async () => {
        mockStorageInstance.getSession.mockResolvedValue(mockSession)

        const result = await sessionManager.getCurrentSession()

        expect(result).toEqual(mockSession)
      })

      it('should return null when session is expired', async () => {
        const expiredSession: SessionData = {
          ...mockSession,
          expiresAt: new Date(Date.now() - 60 * 1000).toISOString()
        }
        mockStorageInstance.getSession.mockResolvedValue(expiredSession)

        const result = await sessionManager.getCurrentSession()

        expect(result).toBeNull()
      })
    })
  })

  describe('Session Storage', () => {
    const mockSession: SessionData = {
      userId: 'user123',
      sessionId: 'session456',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      remember: true
    }

    describe('storeSession', () => {
      it('should store session successfully', async () => {
        mockStorageInstance.storeSession.mockResolvedValue()

        await sessionManager.storeSession(mockSession)

        expect(mockStorageInstance.storeSession).toHaveBeenCalledWith(mockSession)
      })

      it('should store session and refresh token', async () => {
        const refreshToken = 'refresh123'
        mockStorageInstance.storeSession.mockResolvedValue()
        mockStorageInstance.storeRefreshToken.mockResolvedValue()

        await sessionManager.storeSession(mockSession, refreshToken)

        expect(mockStorageInstance.storeSession).toHaveBeenCalledWith(mockSession)
        expect(mockStorageInstance.storeRefreshToken).toHaveBeenCalledWith(refreshToken)
      })

      it('should throw error when storage fails', async () => {
        mockStorageInstance.storeSession.mockRejectedValue(new Error('Storage failed'))

        await expect(sessionManager.storeSession(mockSession)).rejects.toThrow('Failed to store session')
      })
    })

    describe('clearSession', () => {
      it('should clear all session data', async () => {
        mockStorageInstance.clearAll.mockResolvedValue()

        await sessionManager.clearSession()

        expect(mockStorageInstance.clearAll).toHaveBeenCalled()
      })

      it('should throw error when clear fails', async () => {
        mockStorageInstance.clearAll.mockRejectedValue(new Error('Clear failed'))

        await expect(sessionManager.clearSession()).rejects.toThrow('Failed to clear session')
      })
    })
  })

  describe('Session Refresh', () => {
    const mockSession: SessionData = {
      userId: 'user123',
      sessionId: 'session456',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      remember: true
    }

    describe('refreshSession', () => {
      it('should refresh session successfully', async () => {
        const refreshToken = 'refresh123'
        const newSession: SessionData = {
          ...mockSession,
          sessionId: 'newSession789'
        }
        const newRefreshToken = 'newRefresh456'

        mockStorageInstance.getRefreshToken.mockResolvedValue(refreshToken)
        mockStorageInstance.storeSession.mockResolvedValue()
        mockStorageInstance.storeRefreshToken.mockResolvedValue()

        const refreshCallback = jest.fn().mockResolvedValue({
          session: newSession,
          refreshToken: newRefreshToken
        })

        const result = await sessionManager.refreshSession(refreshCallback)

        expect(refreshCallback).toHaveBeenCalledWith(refreshToken)
        expect(mockStorageInstance.storeSession).toHaveBeenCalledWith(newSession)
        expect(mockStorageInstance.storeRefreshToken).toHaveBeenCalledWith(newRefreshToken)
        expect(result).toEqual(newSession)
      })

      it('should return null when no refresh token exists', async () => {
        mockStorageInstance.getRefreshToken.mockResolvedValue(null)
        mockStorageInstance.clearAll.mockResolvedValue()

        const refreshCallback = jest.fn()

        const result = await sessionManager.refreshSession(refreshCallback)

        expect(refreshCallback).not.toHaveBeenCalled()
        expect(mockStorageInstance.clearAll).toHaveBeenCalled()
        expect(result).toBeNull()
      })

      it('should clear session when refresh fails', async () => {
        const refreshToken = 'refresh123'
        mockStorageInstance.getRefreshToken.mockResolvedValue(refreshToken)
        mockStorageInstance.clearAll.mockResolvedValue()

        const refreshCallback = jest.fn().mockRejectedValue(new Error('Refresh failed'))

        await expect(sessionManager.refreshSession(refreshCallback)).rejects.toThrow('Refresh failed')
        expect(mockStorageInstance.clearAll).toHaveBeenCalled()
      })

      it('should prevent concurrent refresh attempts', async () => {
        const refreshToken = 'refresh123'
        const newSession: SessionData = {
          ...mockSession,
          sessionId: 'newSession789'
        }

        mockStorageInstance.getRefreshToken.mockResolvedValue(refreshToken)
        mockStorageInstance.storeSession.mockResolvedValue()
        mockStorageInstance.storeRefreshToken.mockResolvedValue()

        const refreshCallback = jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ session: newSession }), 100))
        )

        // Start two concurrent refresh attempts
        const promise1 = sessionManager.refreshSession(refreshCallback)
        const promise2 = sessionManager.refreshSession(refreshCallback)

        const [result1, result2] = await Promise.all([promise1, promise2])

        // Should only call the refresh callback once
        expect(refreshCallback).toHaveBeenCalledTimes(1)
        expect(result1).toEqual(newSession)
        expect(result2).toEqual(newSession)
      })
    })
  })

  describe('Session Utilities', () => {
    const mockSession: SessionData = {
      userId: 'user123',
      sessionId: 'session456',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      remember: true
    }

    describe('hasRememberedSession', () => {
      it('should return true when session has remember flag', async () => {
        mockStorageInstance.getSession.mockResolvedValue(mockSession)

        const result = await sessionManager.hasRememberedSession()

        expect(result).toBe(true)
      })

      it('should return false when session does not have remember flag', async () => {
        const sessionWithoutRemember: SessionData = {
          ...mockSession,
          remember: false
        }
        mockStorageInstance.getSession.mockResolvedValue(sessionWithoutRemember)

        const result = await sessionManager.hasRememberedSession()

        expect(result).toBe(false)
      })

      it('should return false when no session exists', async () => {
        mockStorageInstance.getSession.mockResolvedValue(null)

        const result = await sessionManager.hasRememberedSession()

        expect(result).toBe(false)
      })
    })

    describe('updateSessionExpiration', () => {
      it('should update session expiration time', async () => {
        const newExpirationTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        mockStorageInstance.getSession.mockResolvedValue(mockSession)
        mockStorageInstance.storeSession.mockResolvedValue()

        await sessionManager.updateSessionExpiration(newExpirationTime)

        expect(mockStorageInstance.storeSession).toHaveBeenCalledWith({
          ...mockSession,
          expiresAt: newExpirationTime
        })
      })

      it('should throw error when no active session', async () => {
        mockStorageInstance.getSession.mockResolvedValue(null)

        await expect(sessionManager.updateSessionExpiration('2024-12-31T23:59:59Z'))
          .rejects.toThrow('No active session to update')
      })
    })

    describe('getSessionTimeRemaining', () => {
      it('should return time remaining in milliseconds', async () => {
        const futureTime = Date.now() + 30 * 60 * 1000 // 30 minutes from now
        const sessionWithFutureExpiry: SessionData = {
          ...mockSession,
          expiresAt: new Date(futureTime).toISOString()
        }
        mockStorageInstance.getSession.mockResolvedValue(sessionWithFutureExpiry)

        const result = await sessionManager.getSessionTimeRemaining()

        expect(result).toBeGreaterThan(25 * 60 * 1000) // Should be around 30 minutes
        expect(result).toBeLessThan(35 * 60 * 1000)
      })

      it('should return 0 when session is expired', async () => {
        const pastTime = Date.now() - 30 * 60 * 1000 // 30 minutes ago
        const expiredSession: SessionData = {
          ...mockSession,
          expiresAt: new Date(pastTime).toISOString()
        }
        mockStorageInstance.getSession.mockResolvedValue(expiredSession)

        const result = await sessionManager.getSessionTimeRemaining()

        expect(result).toBe(0)
      })

      it('should return 0 when no session exists', async () => {
        mockStorageInstance.getSession.mockResolvedValue(null)

        const result = await sessionManager.getSessionTimeRemaining()

        expect(result).toBe(0)
      })
    })

    describe('needsRefresh', () => {
      it('should return true when session expires within threshold', async () => {
        const futureTime = Date.now() + 3 * 60 * 1000 // 3 minutes from now
        const sessionNearExpiry: SessionData = {
          ...mockSession,
          expiresAt: new Date(futureTime).toISOString()
        }
        mockStorageInstance.getSession.mockResolvedValue(sessionNearExpiry)

        const result = await sessionManager.needsRefresh(5) // 5 minute threshold

        expect(result).toBe(true)
      })

      it('should return false when session has plenty of time left', async () => {
        const futureTime = Date.now() + 30 * 60 * 1000 // 30 minutes from now
        const sessionWithTime: SessionData = {
          ...mockSession,
          expiresAt: new Date(futureTime).toISOString()
        }
        mockStorageInstance.getSession.mockResolvedValue(sessionWithTime)

        const result = await sessionManager.needsRefresh(5) // 5 minute threshold

        expect(result).toBe(false)
      })

      it('should return false when session is expired', async () => {
        const pastTime = Date.now() - 30 * 60 * 1000 // 30 minutes ago
        const expiredSession: SessionData = {
          ...mockSession,
          expiresAt: new Date(pastTime).toISOString()
        }
        mockStorageInstance.getSession.mockResolvedValue(expiredSession)

        const result = await sessionManager.needsRefresh()

        expect(result).toBe(false)
      })
    })

    describe('performCleanup', () => {
      it('should clear session when expired', async () => {
        const expiredSession: SessionData = {
          ...mockSession,
          expiresAt: new Date(Date.now() - 60 * 1000).toISOString()
        }
        mockStorageInstance.getSession.mockResolvedValue(expiredSession)
        mockStorageInstance.clearAll.mockResolvedValue()

        await sessionManager.performCleanup()

        expect(mockStorageInstance.clearAll).toHaveBeenCalled()
      })

      it('should not clear session when valid', async () => {
        mockStorageInstance.getSession.mockResolvedValue(mockSession)

        await sessionManager.performCleanup()

        expect(mockStorageInstance.clearAll).not.toHaveBeenCalled()
      })

      it('should clear session on validation error', async () => {
        // Mock validateSession to throw an error by making it fail in a way that bypasses internal error handling
        const originalValidateSession = sessionManager.validateSession
        jest.spyOn(sessionManager, 'validateSession').mockRejectedValue(new Error('Validation error'))
        mockStorageInstance.clearAll.mockResolvedValue()

        await sessionManager.performCleanup()

        expect(mockStorageInstance.clearAll).toHaveBeenCalled()
        
        // Restore original method
        sessionManager.validateSession = originalValidateSession
      })
    })

    describe('getSessionMetadata', () => {
      it('should return session metadata without sensitive data', async () => {
        mockStorageInstance.getSession.mockResolvedValue(mockSession)

        const result = await sessionManager.getSessionMetadata()

        expect(result).toEqual({
          userId: mockSession.userId,
          expiresAt: mockSession.expiresAt,
          remember: mockSession.remember
        })
      })

      it('should return null when no session exists', async () => {
        mockStorageInstance.getSession.mockResolvedValue(null)

        const result = await sessionManager.getSessionMetadata()

        expect(result).toBeNull()
      })
    })
  })
})