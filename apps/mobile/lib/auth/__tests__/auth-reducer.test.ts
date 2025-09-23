import { authReducer, initialAuthState } from '../auth-reducer'
import type { AuthAction, AuthState } from '../types'

describe('authReducer', () => {
	const mockUser = {
		id: '1',
		email: 'test@example.com',
		username: 'testuser',
		name: 'Test User',
		createdAt: '2023-01-01T00:00:00Z',
		updatedAt: '2023-01-01T00:00:00Z',
	}

	const mockSession = {
		accessToken: 'access-token-123',
		refreshToken: 'refresh-token-123',
		expiresIn: 3600,
		expiresAt: '2023-12-31T23:59:59Z',
	}

	describe('initial state', () => {
		it('should have correct initial state', () => {
			expect(initialAuthState).toEqual({
				user: null,
				tokens: null,
				isLoading: false,
				error: null,
				isAuthenticated: false,
			})
		})
	})

	describe('AUTH_START', () => {
		it('should set loading to true and clear error', () => {
			const previousState: AuthState = {
				...initialAuthState,
				error: 'Previous error',
			}

			const action: AuthAction = { type: 'AUTH_START' }
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				...previousState,
				isLoading: true,
				error: null,
			})
		})
	})

	describe('AUTH_SUCCESS', () => {
		it('should set user and session, clear loading and error, set authenticated to true', () => {
			const previousState: AuthState = {
				...initialAuthState,
				isLoading: true,
				error: 'Some error',
			}

			const action: AuthAction = {
				type: 'AUTH_SUCCESS',
				payload: { user: mockUser, tokens: mockSession },
			}
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				user: mockUser,
				tokens: mockSession,
				isLoading: false,
				error: null,
				isAuthenticated: true,
			})
		})
	})

	describe('AUTH_ERROR', () => {
		it('should clear user and tokens, set error, clear loading, set authenticated to false', () => {
			const previousState: AuthState = {
				user: mockUser,
				tokens: mockSession,
				isLoading: true,
				error: null,
				isAuthenticated: true,
			}

			const action: AuthAction = {
				type: 'AUTH_ERROR',
				payload: { error: 'Authentication failed' },
			}
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				user: null,
				tokens: null,
				isLoading: false,
				error: 'Authentication failed',
				isAuthenticated: false,
			})
		})
	})

	describe('LOGOUT', () => {
		it('should reset state to initial state', () => {
			const previousState: AuthState = {
				user: mockUser,
				tokens: mockSession,
				isLoading: false,
				error: null,
				isAuthenticated: true,
			}

			const action: AuthAction = { type: 'LOGOUT' }
			const newState = authReducer(previousState, action)

			expect(newState).toEqual(initialAuthState)
		})
	})

	describe('REFRESH_START', () => {
		it('should set loading to true and clear error', () => {
			const previousState: AuthState = {
				...initialAuthState,
				user: mockUser,
				tokens: mockSession,
				isAuthenticated: true,
				error: 'Previous error',
			}

			const action: AuthAction = { type: 'REFRESH_START' }
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				...previousState,
				isLoading: true,
				error: null,
			})
		})
	})

	describe('REFRESH_SUCCESS', () => {
		it('should update user and session, clear loading and error', () => {
			const updatedUser = { ...mockUser, name: 'Updated User' }
			const updatedSession = {
				...mockSession,
				expiresAt: '2024-12-31T23:59:59Z',
			}

			const previousState: AuthState = {
				user: mockUser,
				tokens: mockSession,
				isLoading: true,
				error: null,
				isAuthenticated: true,
			}

			const action: AuthAction = {
				type: 'REFRESH_SUCCESS',
				payload: { user: updatedUser, tokens: updatedSession },
			}
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				user: updatedUser,
				tokens: updatedSession,
				isLoading: false,
				error: null,
				isAuthenticated: true,
			})
		})
	})

	describe('REFRESH_ERROR', () => {
		it('should set error and clear loading but preserve authentication state', () => {
			const previousState: AuthState = {
				user: mockUser,
				tokens: mockSession,
				isLoading: true,
				error: null,
				isAuthenticated: true,
			}

			const action: AuthAction = {
				type: 'REFRESH_ERROR',
				payload: { error: 'Refresh failed' },
			}
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				user: mockUser,
				tokens: mockSession,
				isLoading: false,
				error: 'Refresh failed',
				isAuthenticated: true,
			})
		})
	})

	describe('CLEAR_ERROR', () => {
		it('should clear error while preserving other state', () => {
			const previousState: AuthState = {
				user: mockUser,
				tokens: mockSession,
				isLoading: false,
				error: 'Some error',
				isAuthenticated: true,
			}

			const action: AuthAction = { type: 'CLEAR_ERROR' }
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				...previousState,
				error: null,
			})
		})
	})

	describe('SET_LOADING', () => {
		it('should set loading state while preserving other state', () => {
			const previousState: AuthState = {
				user: mockUser,
				tokens: mockSession,
				isLoading: false,
				error: null,
				isAuthenticated: true,
			}

			const action: AuthAction = {
				type: 'SET_LOADING',
				payload: { isLoading: true },
			}
			const newState = authReducer(previousState, action)

			expect(newState).toEqual({
				...previousState,
				isLoading: true,
			})
		})
	})

	describe('unknown action', () => {
		it('should return current state for unknown action', () => {
			const previousState: AuthState = {
				user: mockUser,
				tokens: mockSession,
				isLoading: false,
				error: null,
				isAuthenticated: true,
			}

			// @ts-expect-error Testing unknown action type
			const action: AuthAction = { type: 'UNKNOWN_ACTION' }
			const newState = authReducer(previousState, action)

			expect(newState).toBe(previousState)
		})
	})
})
