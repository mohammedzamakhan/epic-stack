import { useContext } from 'react'
import { useAuth } from '../use-auth'
import { AuthContext } from '../../auth-context'

// Mock useContext
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}))

const mockUseContext = useContext as jest.MockedFunction<typeof useContext>

describe('useAuth', () => {
  const mockContextValue = {
    user: null,
    session: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    login: jest.fn(),
    signup: jest.fn(),
    socialLogin: jest.fn(),
    logout: jest.fn(),
    refreshSession: jest.fn(),
    clearError: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return auth context when context is available', () => {
    mockUseContext.mockReturnValue(mockContextValue)

    const result = useAuth()

    expect(mockUseContext).toHaveBeenCalledWith(AuthContext)
    expect(result).toBe(mockContextValue)
  })

  it('should throw error when context is null', () => {
    mockUseContext.mockReturnValue(null)

    expect(() => {
      useAuth()
    }).toThrow('useAuth must be used within an AuthProvider')
  })

  it('should throw error when context is undefined', () => {
    mockUseContext.mockReturnValue(undefined)

    expect(() => {
      useAuth()
    }).toThrow('useAuth must be used within an AuthProvider')
  })
})