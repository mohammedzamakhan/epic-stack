import { getClientIp } from '@repo/security'
import { type ActionFunctionArgs } from 'react-router'
import { logMCPRateLimitExceeded } from '#app/utils/mcp/audit.server.ts'
import {
	exchangeAuthorizationCode,
	refreshAccessToken,
} from '#app/utils/mcp/oauth.server.ts'
import {
	checkRateLimit,
	RATE_LIMITS,
	createRateLimitResponse,
} from '#app/utils/rate-limit.server.ts'

/**
 * OAuth 2.0 Token Endpoint
 * Handles authorization code exchange and refresh token flows
 *
 * Supports:
 * - grant_type=authorization_code: Exchange authorization code for tokens
 * - grant_type=refresh_token: Refresh an expired access token
 */
export async function action({ request }: ActionFunctionArgs) {
	// Only POST requests are allowed
	if (request.method !== 'POST') {
		return Response.json(
			{
				error: 'invalid_request',
				error_description: 'Only POST requests are allowed',
			},
			{ status: 405 },
		)
	}

	// Check rate limit for token endpoint (20 per hour per IP)
	const clientIp = getClientIp(request)
	const rateLimitCheck = await checkRateLimit(
		{ type: 'ip', value: clientIp },
		RATE_LIMITS.token,
	)

	if (!rateLimitCheck.allowed) {
		await logMCPRateLimitExceeded(undefined, undefined, 'token', request)
		return createRateLimitResponse(rateLimitCheck.resetAt)
	}

	// Parse request body
	let body: Record<string, any> = {}
	try {
		const contentType = request.headers.get('content-type')
		if (contentType?.includes('application/x-www-form-urlencoded')) {
			const formData = await request.formData()
			body = Object.fromEntries(formData) as Record<string, any>
		} else if (contentType?.includes('application/json')) {
			body = (await request.json()) as Record<string, any>
		} else {
			return Response.json(
				{
					error: 'invalid_request',
					error_description:
						'Content-Type must be application/x-www-form-urlencoded or application/json',
				},
				{ status: 400 },
			)
		}
	} catch (error) {
		return Response.json(
			{
				error: 'invalid_request',
				error_description: 'Invalid request body',
			},
			{ status: 400 },
		)
	}

	const grantType = body.grant_type
	const code = body.code
	const redirectUri = body.redirect_uri
	const refreshToken = body.refresh_token
	const codeVerifier = body.code_verifier

	// Validate grant_type parameter
	if (!grantType) {
		return Response.json(
			{
				error: 'invalid_request',
				error_description: 'grant_type parameter is required',
			},
			{ status: 400 },
		)
	}

	// Handle authorization_code grant type
	if (grantType === 'authorization_code') {
		// Validate required parameters
		if (!code) {
			return Response.json(
				{
					error: 'invalid_request',
					error_description:
						'code parameter is required for authorization_code grant',
				},
				{ status: 400 },
			)
		}

		if (!redirectUri) {
			return Response.json(
				{
					error: 'invalid_request',
					error_description:
						'redirect_uri parameter is required for authorization_code grant',
				},
				{ status: 400 },
			)
		}

		// Exchange authorization code for tokens (with PKCE verification if code_verifier provided)
		const tokenResponse = await exchangeAuthorizationCode(
			code,
			redirectUri,
			codeVerifier,
		)

		if (!tokenResponse) {
			return Response.json(
				{
					error: 'invalid_grant',
					error_description: 'Invalid or expired authorization code',
				},
				{ status: 400 },
			)
		}

		return Response.json(tokenResponse, { status: 200 })
	}

	// Handle refresh_token grant type
	if (grantType === 'refresh_token') {
		// Validate required parameters
		if (!refreshToken) {
			return Response.json(
				{
					error: 'invalid_request',
					error_description:
						'refresh_token parameter is required for refresh_token grant',
				},
				{ status: 400 },
			)
		}

		// Refresh access token
		const tokenResponse = await refreshAccessToken(refreshToken)

		if (!tokenResponse) {
			return Response.json(
				{
					error: 'invalid_grant',
					error_description: 'Invalid or expired refresh token',
				},
				{ status: 400 },
			)
		}

		return Response.json(tokenResponse, { status: 200 })
	}

	// Unsupported grant type
	return Response.json(
		{
			error: 'unsupported_grant_type',
			error_description: `Grant type '${grantType}' is not supported`,
		},
		{ status: 400 },
	)
}
