import { type LoaderFunctionArgs } from 'react-router'
import { verifySessionToken } from '#app/utils/openreplay.server.ts'

/**
 * OpenReplay tags endpoint
 * GET /api/openreplay/v1/web/tags
 *
 * This endpoint returns the list of tags configuration for the project.
 * It is used by the OpenReplay tracker to determine conditional recording logic
 * or other tag-based configuration.
 *
 * Requires: Authorization: Bearer <token>
 */
export async function loader({ request }: LoaderFunctionArgs) {
	// Handle OPTIONS requests for CORS preflight
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 200,
			headers: getCORSHeaders(request),
		})
	}

	// Extract bearer token from Authorization header
	const authHeader = request.headers.get('authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return Response.json(
			{
				error: 'Missing or invalid Authorization header',
			},
			{
				status: 401,
				headers: getCORSHeaders(request),
			},
		)
	}

	const token = authHeader.slice(7) // Remove "Bearer " prefix

	try {
		// Verify token and extract projectKey
		const session = verifySessionToken(token)

		// For now, return an empty list of tags as we don't have a tags system yet
		// In a real implementation, this would fetch tags from the database
		const response = {
			tags: [],
		}

		return Response.json(response, {
			status: 200,
			headers: getCORSHeaders(request),
		})
	} catch (error) {
		return Response.json(
			{
				error: 'Invalid or expired token',
			},
			{
				status: 401,
				headers: getCORSHeaders(request),
			},
		)
	}
}

/**
 * Handle preflight OPTIONS requests for CORS
 */
export async function options({ request }: { request: Request }) {
	return new Response(null, {
		status: 200,
		headers: getCORSHeaders(request),
	})
}

/**
 * Get comprehensive CORS headers with origin handling and credentials support
 */
function getCORSHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get('origin')

	return {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': origin || '*',
		'Access-Control-Allow-Methods': 'GET, OPTIONS',
		'Access-Control-Allow-Headers':
			'Content-Type, Authorization, X-Requested-With',
		'Access-Control-Allow-Credentials': 'true',
		'Access-Control-Max-Age': '86400', // 24 hours
	}
}
