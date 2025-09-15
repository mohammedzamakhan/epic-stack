import { describe, it, expect } from 'vitest'
import type {
  ApiResponse,
  LoginRequest,
  LoginApiResponse,
  SignupRequest,
  SignupApiResponse,
  NetworkError,
  ValidationErrorResponse,
  HttpMethod,
  RequestConfig,
} from '../api.js'

describe('API Types', () => {
  it('should define ApiResponse interface correctly', () => {
    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Hello World' },
      status: 200,
    }

    expect(response.success).toBe(true)
    expect(response.data?.message).toBe('Hello World')
    expect(response.status).toBe(200)
  })

  it('should define LoginRequest interface correctly', () => {
    const request: LoginRequest = {
      username: 'testuser',
      password: 'password123',
      remember: true,
      redirectTo: '/dashboard',
    }

    expect(request.username).toBe('testuser')
    expect(request.password).toBe('password123')
    expect(request.remember).toBe(true)
  })

  it('should define LoginApiResponse interface correctly', () => {
    const response: LoginApiResponse = {
      success: true,
      status: 200,
      data: {
        user: {
          id: 'user123',
          email: 'test@example.com',
          username: 'testuser',
          name: 'Test User',
          image: {
            id: 'img123',
            altText: 'Profile picture',
            objectKey: 'profile/user123.jpg',
          },
        },
        session: {
          id: 'session123',
          expirationDate: '2023-12-31T23:59:59Z',
        },
        requiresTwoFactor: false,
      },
      redirectTo: '/dashboard',
    }

    expect(response.success).toBe(true)
    expect(response.data?.user.id).toBe('user123')
    expect(response.data?.session.id).toBe('session123')
    expect(response.data?.requiresTwoFactor).toBe(false)
  })

  it('should define SignupRequest interface correctly', () => {
    const request: SignupRequest = {
      email: 'test@example.com',
      redirectTo: '/onboarding',
    }

    expect(request.email).toBe('test@example.com')
    expect(request.redirectTo).toBe('/onboarding')
  })

  it('should define SignupApiResponse interface correctly', () => {
    const response: SignupApiResponse = {
      success: true,
      status: 200,
      data: {
        verificationRequired: true,
        redirectTo: '/verify-email',
      },
    }

    expect(response.success).toBe(true)
    expect(response.data?.verificationRequired).toBe(true)
    expect(response.data?.redirectTo).toBe('/verify-email')
  })

  it('should define NetworkError interface correctly', () => {
    const error: NetworkError = {
      type: 'timeout',
      message: 'Request timed out after 5000ms',
      originalError: new Error('Timeout'),
    }

    expect(error.type).toBe('timeout')
    expect(error.message).toBe('Request timed out after 5000ms')
    expect(error.originalError).toBeInstanceOf(Error)
  })

  it('should define ValidationErrorResponse interface correctly', () => {
    const response: ValidationErrorResponse = {
      success: false,
      status: 400,
      error: 'validation_error',
      errors: [
        {
          field: 'email',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
        },
        {
          field: 'password',
          message: 'Password is too short',
          code: 'PASSWORD_TOO_SHORT',
        },
      ],
    }

    expect(response.success).toBe(false)
    expect(response.error).toBe('validation_error')
    expect(response.errors).toHaveLength(2)
    expect(response.errors[0].field).toBe('email')
  })

  it('should define HttpMethod type correctly', () => {
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
    expect(methods).toContain('PUT')
    expect(methods).toContain('PATCH')
    expect(methods).toContain('DELETE')
  })

  it('should define RequestConfig interface correctly', () => {
    const config: RequestConfig = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
      },
      body: { username: 'test', password: 'pass' },
      timeout: 5000,
      retries: 3,
    }

    expect(config.method).toBe('POST')
    expect(config.headers?.['Content-Type']).toBe('application/json')
    expect(config.timeout).toBe(5000)
    expect(config.retries).toBe(3)
  })

  it('should allow optional fields in ApiResponse', () => {
    const minimalResponse: ApiResponse = {
      success: false,
      status: 500,
    }

    expect(minimalResponse.success).toBe(false)
    expect(minimalResponse.data).toBeUndefined()
    expect(minimalResponse.error).toBeUndefined()
  })

  it('should allow optional fields in LoginRequest', () => {
    const minimalRequest: LoginRequest = {
      username: 'testuser',
      password: 'password123',
    }

    expect(minimalRequest.remember).toBeUndefined()
    expect(minimalRequest.redirectTo).toBeUndefined()
  })
})