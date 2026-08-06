import { type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router'
import { z } from 'zod'
import { getClientIp } from '@repo/security'
import {
	createOpenReplaySession,
	generateSessionToken,
	validateProjectKey,
	getOpenReplayConfig,
} from '#app/utils/openreplay.server.ts'
import { parseUserAgent, getUserAgent } from '#app/utils/user-agent.server.ts'

// Validation schema for session start request
const SessionStartSchema = z.object({
	projectKey: z.string().min(1, 'Project key is required'),
	userUUID: z
		.string()
		.nullish()
		.transform((v) => v ?? undefined),
	metadata: z.record(z.any()).optional(),
})

/**
 * OpenReplay session initialization endpoint
 * POST /api/openreplay/v1/web/start
 *
 * This endpoint mimics the OpenReplay session start API to initialize
 * a new recording session and return a JWT token for authentication.
 * Only supports POST method in action function.
 */
export async function action({ request }: ActionFunctionArgs) {
	// Only allow POST requests in action
	if (request.method !== 'POST') {
		return new Response('Method not allowed', {
			status: 405,
			headers: getCORSHeaders(request),
		})
	}

	return handleSessionStart(request)
}

/**
 * Handle preflight OPTIONS requests for CORS
 */
export async function loader({ request }: LoaderFunctionArgs) {
	// Handle OPTIONS requests for CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers':
					'Content-Type, Authorization, X-Requested-With',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Max-Age': '86400',
			},
		})
	}

	return handleSessionStart(request)
}

/**
 * Handle preflight OPTIONS requests for CORS
 */
export async function options({ request }: { request: Request }) {
	const origin = request.headers.get('origin')

	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': origin || '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers':
				'Content-Type, Authorization, X-Requested-With',
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Max-Age': '86400', // 24 hours
		},
	})
}

/**
 * Core session start handler for both GET and POST requests
 */
async function handleSessionStart(request: Request) {
	try {
		let validatedData: z.infer<typeof SessionStartSchema>

		if (request.method === 'GET') {
			// Parse query parameters for GET requests
			const url = new URL(request.url)
			const projectKey = url.searchParams.get('projectKey')
			const userUUID = url.searchParams.get('userUUID') || undefined
			const metadataParam = url.searchParams.get('metadata')

			let metadata: Record<string, any> | undefined
			if (metadataParam) {
				try {
					metadata = JSON.parse(metadataParam) as Record<string, any>
				} catch {
					metadata = undefined
				}
			}

			validatedData = SessionStartSchema.parse({
				projectKey,
				userUUID,
				metadata,
			})
		} else if (request.method === 'POST') {
			// Parse JSON body for POST requests
			const body = await request.json()
			validatedData = SessionStartSchema.parse(body)
		} else {
			return new Response('Method not allowed', {
				status: 405,
				headers: getCORSHeaders(request),
			})
		}

		// Validate project key
		if (!validateProjectKey(validatedData.projectKey)) {
			return Response.json(
				{
					error: 'Invalid project key',
				},
				{
					status: 400,
					headers: getCORSHeaders(request),
				},
			)
		}

		// Extract client information
		const userAgent = getUserAgent(request)
		const clientIp = getClientIp(request)
		const deviceInfo = parseUserAgent(userAgent)

		// Generate a new userUUID if not provided
		const userUUID = validatedData.userUUID || crypto.randomUUID()

		// Create new OpenReplay session
		const session = createOpenReplaySession(
			validatedData.projectKey,
			userUUID,
			validatedData.metadata,
		)

		// Generate JWT token for session authentication using HS256
		const token = generateSessionToken(session)

		// Get project configuration
		const config = getOpenReplayConfig(validatedData.projectKey)

		// Build comprehensive response matching OpenReplay SDK expectations
		const response = {
			// Core session data
			sessionToken: token,
			sessionID: session.sessionId,
			sessionHash: session.sessionHash,

			// OpenReplay-specific fields from GitHub specification
			token: token, // Duplicate of sessionToken for compatibility
			userUUID: session.userUUID,
			projectID: session.projectKey, // Map projectKey to projectID
			beaconSizeLimit: 64 * 1024, // 64KB limit for beacon requests
			compressionThreshold: 24 * 1024, // 24KB threshold for compression

			// Endpoint configuration
			ingestPoint: `${new URL(request.url).origin}/api/openreplay/v1/web/i`,
			projectKey: session.projectKey,

			// User identification and metadata
			metadata: session.metadata,

			// Timing and performance
			startTime: session.startTime,
			delay: 0, // No artificial delay for session start

			// Device and browser information
			userBrowser: deviceInfo.browserName,
			userBrowserVersion: deviceInfo.browserVersion,
			userOS: deviceInfo.osName,
			userOSVersion: deviceInfo.osVersion,
			userDevice: deviceInfo.deviceType,
			userDeviceName: deviceInfo.deviceName,

			// Network and location information
			clientIP: clientIp,
			userCity: null, // Not implemented - would require GeoIP lookup
			userCountry: null, // Not implemented - would require GeoIP lookup
			userState: null, // Not implemented - would require GeoIP lookup

			// Canvas recording configuration
			canvasEnabled: true, // Enable canvas recording by default
			canvasQuality: 0.4, // Canvas recording quality (0.0-1.0)
			canvasFPS: 12, // Canvas recording frame rate

			// Recording mode configuration
			assistOnly: false, // Full recording mode, not assist-only

			// Configuration
			config: {
				...config,
				// Additional OpenReplay-specific config
				captureConsole: true,
				captureNetwork: true,
				capturePerformance: true,
				captureExceptions: true,
			},
		}

		return Response.json(response, {
			status: 200,
			headers: getCORSHeaders(request),
		})
	} catch (error) {
		console.error('OpenReplay session start error:', error)

		if (error instanceof z.ZodError) {
			return Response.json(
				{
					error: 'Invalid request data',
					details: error.errors,
				},
				{
					status: 400,
					headers: getCORSHeaders(request),
				},
			)
		}

		return Response.json(
			{
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
			},
			{
				status: 500,
				headers: getCORSHeaders(request),
			},
		)
	}
}

/**
 * Get comprehensive CORS headers with origin handling and credentials support
 */
function getCORSHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('origin')

	return {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': origin || '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers':
			'Content-Type, Authorization, X-Requested-With',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
	}
}
