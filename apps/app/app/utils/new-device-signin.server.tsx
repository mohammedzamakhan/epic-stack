import { getClientIp, trackIpRequest } from '@repo/common/ip-tracking'
import { brand } from '@repo/config/brand'
import {
	and,
	db,
	eq,
	IpAddress,
	IpAddressUser,
	RefreshToken,
	User,
} from '@repo/database'
import { NewDeviceSigninEmail, sendEmail } from '@repo/email'
import { logger } from '@repo/observability'
import React from 'react'
import { parseUserAgent, getUserAgent } from './user-agent.server.ts'

interface CheckNewDeviceParams {
	userId: string
	request: Request
}

interface NewDeviceInfo {
	isNewDevice: boolean
	deviceInfo: ReturnType<typeof parseUserAgent>
	ipAddress: string
}

/**
 * Check if this is a new device for the user
 * A new device is determined by IP + User-Agent combination
 */
export async function checkNewDevice({
	userId,
	request,
}: CheckNewDeviceParams): Promise<NewDeviceInfo> {
	const userAgent = getUserAgent(request)
	const ipAddress = getClientIp(request)
	const deviceInfo = parseUserAgent(userAgent)

	// Track this IP request
	await trackIpRequest({
		ip: ipAddress,
		method: request.method,
		path: new URL(request.url).pathname,
		userAgent: userAgent ?? undefined,
		userId,
	})

	// Check if we've seen this IP address for this user before
	const [ipAddressRecord] = await db
		.select({ id: IpAddress.id })
		.from(IpAddress)
		.innerJoin(IpAddressUser, eq(IpAddressUser.ipAddressId, IpAddress.id))
		.where(and(eq(IpAddress.ip, ipAddress), eq(IpAddressUser.userId, userId)))
		.limit(1)

	// If we have no record of this IP for this user, it's a new device
	const isNewDevice = !ipAddressRecord

	// Alternative: Check refresh tokens for similar user-agent + IP combination
	// This provides more granular device tracking
	if (!isNewDevice && userAgent) {
		const [existingTokenWithSimilarDevice] = await db
			.select({ id: RefreshToken.id })
			.from(RefreshToken)
			.where(
				and(
					eq(RefreshToken.userId, userId),
					eq(RefreshToken.userAgent, userAgent),
					eq(RefreshToken.ipAddress, ipAddress),
					eq(RefreshToken.revoked, false),
				),
			)
			.limit(1)

		// If no existing token with this exact combo, consider it new
		if (!existingTokenWithSimilarDevice) {
			return {
				isNewDevice: true,
				deviceInfo,
				ipAddress,
			}
		}
	}

	return {
		isNewDevice,
		deviceInfo,
		ipAddress,
	}
}

/**
 * Send new device sign-in notification email
 */
export async function sendNewDeviceSigninEmail({
	userId,
	deviceInfo,
	ipAddress,
	location,
}: {
	userId: string
	deviceInfo: ReturnType<typeof parseUserAgent>
	ipAddress: string
	location?: string
}) {
	// Get user information
	const [user] = await db
		.select({ email: User.email, name: User.name })
		.from(User)
		.where(eq(User.id, userId))
		.limit(1)

	if (!user) {
		logger.error({ userId }, 'User not found for new device signin email')
		return
	}

	// Format timestamp
	const timestamp = new Date().toLocaleString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short',
	})

	// Get first name from user's name
	const firstName = user.name?.split(' ')[0] || 'there'

	const baseUrl = process.env.BASE_URL
	if (!baseUrl) {
		throw new Error('BASE_URL environment variable is required')
	}

	// Create secure account URL
	const secureAccountUrl = `${baseUrl}/settings/security`

	try {
		await sendEmail({
			to: user.email,
			subject: brand.email.newDeviceSignin,
			react: (
				<NewDeviceSigninEmail
					firstName={firstName}
					deviceName={deviceInfo.deviceName}
					operatingSystem={deviceInfo.operatingSystem}
					location={location}
					ipAddress={ipAddress}
					timestamp={timestamp}
					secureAccountUrl={secureAccountUrl}
				/>
			),
		})

		logger.info(
			{ email: user.email, device: deviceInfo.deviceName },
			'New device sign-in email sent',
		)
	} catch (error) {
		logger.error({ error }, 'Failed to send new device sign-in email')
		// Don't throw - we don't want to block login if email fails
	}
}

/**
 * Handle new device sign-in detection and notification
 * Call this after successful login
 */
export async function handleNewDeviceSignin({
	userId,
	request,
}: {
	userId: string
	request: Request
}) {
	// Skip new device detection in test environment to avoid interfering with test transactions
	if (process.env.NODE_ENV === 'test') {
		return
	}

	try {
		const { isNewDevice, deviceInfo, ipAddress } = await checkNewDevice({
			userId,
			request,
		})

		if (isNewDevice) {
			// Get location from IP address record if available
			const [ipRecord] = await db
				.select({
					city: IpAddress.city,
					region: IpAddress.region,
					country: IpAddress.country,
				})
				.from(IpAddress)
				.where(eq(IpAddress.ip, ipAddress))
				.limit(1)

			const location = formatLocation(ipRecord ?? null)

			// Send notification email (async, don't wait)
			void sendNewDeviceSigninEmail({
				userId,
				deviceInfo,
				ipAddress,
				location,
			})

			logger.info(
				{ userId, device: deviceInfo.deviceName, ipAddress },
				'New device sign-in detected',
			)
		}
	} catch (error) {
		// Log error but don't throw - we don't want to block login
		logger.error({ error }, 'Error handling new device sign-in')
	}
}

/**
 * Format location string from IP address data
 */
function formatLocation(
	ipRecord: {
		city: string | null
		region: string | null
		country: string | null
	} | null,
): string | undefined {
	if (!ipRecord) return undefined

	const parts = [ipRecord.city, ipRecord.region, ipRecord.country].filter(
		Boolean,
	)

	return parts.length > 0 ? parts.join(', ') : undefined
}
