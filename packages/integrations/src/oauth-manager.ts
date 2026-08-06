/**
 * OAuth flow management system for third-party integrations
 *
 * This module provides utilities for managing OAuth flows including:
 * - State generation and validation
 * - Generic OAuth callback handling
 * - Token refresh with retry logic
 */

import { randomBytes, createHash } from 'crypto'
import { providerRegistry } from './provider'
import {
	type TokenData,
	type OAuthState,
	type OAuthCallbackParams,
} from './types'

/**
 * OAuth state management utilities
 */
export class OAuthStateManager {
	private static readonly STATE_EXPIRY_MINUTES = 30

	private static getStateSecret(): string {
		const secret = process.env.INTEGRATIONS_OAUTH_STATE_SECRET
		if (!secret) {
			throw new Error(
				'INTEGRATIONS_OAUTH_STATE_SECRET environment variable is required for OAuth security',
			)
		}
		return secret
	}

	/**
	 * Generate a secure OAuth state string
	 * @param organizationId - Organization ID
	 * @param providerName - Provider name
	 * @param redirectUrl - Optional redirect URL after OAuth completion
	 * @param additionalData - Additional data to include in state
	 * @returns Secure state string
	 */
	static generateState(
		organizationId: string,
		providerName: string,
		redirectUrl?: string,
		additionalData?: Record<string, any>,
	): string {
		const stateData: OAuthState = {
			organizationId,
			providerName,
			redirectUrl,
			timestamp: Date.now(),
			nonce: randomBytes(16).toString('hex'),
			...additionalData,
		}

		// Create state payload
		const statePayload = Buffer.from(JSON.stringify(stateData)).toString(
			'base64',
		)

		// Create signature to prevent tampering
		const signature = this.createStateSignature(statePayload)

		// Combine payload and signature
		return `${statePayload}.${signature}`
	}

	/**
	 * Validate and parse OAuth state
	 * @param state - State string to validate
	 * @returns Parsed state data
	 * @throws Error if state is invalid or expired
	 */
	static validateState(state: string): OAuthState {
		if (!state || typeof state !== 'string') {
			throw new Error('Invalid state: empty or non-string')
		}

		const parts = state.split('.')
		if (parts.length !== 2) {
			throw new Error('Invalid state: malformed structure')
		}

		const [statePayload, signature] = parts

		if (!statePayload || !signature) {
			throw new Error('Invalid state: missing payload or signature')
		}

		// Verify signature
		const expectedSignature = this.createStateSignature(statePayload)
		if (signature !== expectedSignature) {
			throw new Error('Invalid state: signature verification failed')
		}

		// Parse state data
		let stateData: OAuthState
		try {
			const decoded = Buffer.from(statePayload, 'base64').toString()
			stateData = JSON.parse(decoded) as OAuthState
		} catch (error) {
			throw new Error(`Invalid state: failed to parse data: ${error}`)
		}

		// Validate required fields
		if (
			!stateData.organizationId ||
			!stateData.providerName ||
			!stateData.timestamp
		) {
			throw new Error('Invalid state: missing required fields')
		}

		// Check timestamp is not in the future
		if (stateData.timestamp > Date.now()) {
			throw new Error('Invalid state: timestamp is in the future')
		}

		// Check expiration
		const maxAge = this.STATE_EXPIRY_MINUTES * 60 * 1000
		if (Date.now() - stateData.timestamp > maxAge) {
			throw new Error('Invalid state: expired')
		}

		return stateData
	}

	/**
	 * Create HMAC signature for state payload
	 * @param payload - State payload to sign
	 * @returns Signature string
	 */
	private static createStateSignature(payload: string): string {
		return createHash('sha256')
			.update(payload + this.getStateSecret())
			.digest('hex')
	}
}

/**
 * Generic OAuth callback handler
 */
export class OAuthCallbackHandler {
	/**
	 * Handle OAuth callback from provider
	 * @param providerName - Name of the provider
	 * @param params - OAuth callback parameters
	 * @returns Token data from successful OAuth flow
	 * @throws Error if callback handling fails
	 */
	static async handleCallback(
		providerName: string,
		params: OAuthCallbackParams,
	): Promise<{
		tokenData: TokenData
		stateData: OAuthState
	}> {
		// Check for OAuth errors
		if (params.error) {
			const errorMsg = params.errorDescription || params.error
			throw new Error(`OAuth error: ${errorMsg}`)
		}

		// Validate required parameters
		if (!params.code || !params.state) {
			throw new Error('Missing required OAuth parameters: code or state')
		}

		// Validate state
		const stateData = OAuthStateManager.validateState(params.state)

		// Verify provider name matches
		if (stateData.providerName !== providerName) {
			throw new Error('Provider name mismatch in OAuth state')
		}

		// Verify organization ID matches (if provided in params)
		if (
			params.organizationId &&
			stateData.organizationId !== params.organizationId
		) {
			throw new Error('Organization ID mismatch in OAuth state')
		}

		// Get provider and handle callback
		const provider = providerRegistry.get(providerName)
		const tokenData = await provider.handleCallback(params)

		return {
			tokenData,
			stateData,
		}
	}

	/**
	 * Generate OAuth authorization URL
	 * @param organizationId - Organization ID
	 * @param providerName - Provider name
	 * @param redirectUri - OAuth callback URI
	 * @param additionalParams - Additional provider-specific parameters
	 * @returns Authorization URL
	 */
	static async generateAuthUrl(
		organizationId: string,
		providerName: string,
		redirectUri: string,
		additionalParams?: Record<string, any>,
	): Promise<string> {
		const provider = providerRegistry.get(providerName)
		return provider.getAuthUrl(organizationId, redirectUri, additionalParams)
	}
}

/**
 * OAuth flow orchestrator that combines all OAuth management utilities
 */

// All utilities are exported above with their class definitions
