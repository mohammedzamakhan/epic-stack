import { getClientIp } from '@repo/security'
import {
	and,
	db,
	eq,
	gt,
	IpAddress,
	IpAddressUser,
	sql,
	User,
} from '@repo/database'

export interface IpTrackingData {
	ip: string
	method: string
	path: string
	userAgent?: string
	referer?: string
	statusCode?: number
	userId?: string
}

// Re-export for backward compatibility
export { getClientIp }

export async function trackIpRequest(data: IpTrackingData): Promise<void> {
	try {
		// Skip tracking for certain paths
		const skipPaths = [
			'/assets/',
			'/resources/images',
			'/resources/healthcheck',
			'/favicon.ico',
			'/site.webmanifest',
			'__manifest',
			'/admin',
			'.data',
		]

		const shouldSkip = skipPaths.some((path) => data.path.indexOf(path) === 0)
		if (shouldSkip) {
			return
		}

		// Find or create IP address record
		let [ipRecord] = await db
			.select()
			.from(IpAddress)
			.where(eq(IpAddress.ip, data.ip))
			.limit(1)

		if (!ipRecord) {
			// Try to get geolocation data (you can integrate with a service like ipapi.co)
			const geoData = await getIpGeolocation(data.ip)

			;[ipRecord] = await db
				.insert(IpAddress)
				.values({
					ip: data.ip,
					country: geoData?.country,
					region: geoData?.region,
					city: geoData?.city,
					requestCount: 1,
					lastRequestAt: new Date(),
					lastUserAgent: data.userAgent,
				})
				.returning()
		} else {
			// Update existing record with simple counting
			const updateData: {
				requestCount: ReturnType<typeof sql>
				lastRequestAt: Date
				lastUserAgent?: string
				suspiciousScore?: ReturnType<typeof sql>
			} = {
				requestCount: sql`${IpAddress.requestCount} + 1`,
				lastRequestAt: new Date(),
			}

			// Update user agent if provided
			if (data.userAgent) {
				updateData.lastUserAgent = data.userAgent
			}

			// Simple suspicious activity detection
			const isHighFrequency = await checkHighFrequencyRequests(data.ip)
			if (isHighFrequency) {
				updateData.suspiciousScore = sql`${IpAddress.suspiciousScore} + 1`
			}

			await db
				.update(IpAddress)
				.set(updateData)
				.where(eq(IpAddress.ip, data.ip))
		}

		if (!ipRecord) {
			throw new Error(`Unable to create IP record for ${data.ip}`)
		}

		// Track user-IP relationship if user is logged in
		if (data.userId) {
			await db
				.insert(IpAddressUser)
				.values({
					userId: data.userId,
					ipAddressId: ipRecord.id,
					lastSeenAt: new Date(),
					firstSeenAt: new Date(),
					requestCount: 1,
				})
				.onConflictDoUpdate({
					target: [IpAddressUser.userId, IpAddressUser.ipAddressId],
					set: {
						lastSeenAt: new Date(),
						requestCount: sql`${IpAddressUser.requestCount} + 1`,
					},
				})
		}

		// Check if IP is blacklisted
		if (ipRecord.isBlacklisted) {
			console.log(`Blacklisted IP ${data.ip} attempted to access ${data.path}`)
		}
	} catch (error) {
		// Don't let IP tracking errors break the application
		console.error('Error tracking IP request:', error)
	}
}

// Simple rate limiting check using in-memory tracking
const requestCounts = new Map<string, { count: number; resetTime: number }>()

async function checkHighFrequencyRequests(ip: string): Promise<boolean> {
	const now = Date.now()
	const resetWindow = 60 * 1000 // 1 minute window
	const maxRequests = 100 // Max requests per minute before considering suspicious

	const current = requestCounts.get(ip)

	if (!current || now > current.resetTime) {
		// Reset or initialize counter
		requestCounts.set(ip, { count: 1, resetTime: now + resetWindow })
		return false
	}

	current.count++
	return current.count > maxRequests
}

// Clean up old entries periodically (call this in a background job)
export function cleanupRequestCounts(): void {
	const now = Date.now()
	for (const [ip, data] of requestCounts.entries()) {
		if (now > data.resetTime) {
			requestCounts.delete(ip)
		}
	}
}

interface GeolocationData {
	country?: string
	region?: string
	city?: string
}

async function getIpGeolocation(ip: string): Promise<GeolocationData | null> {
	try {
		// Skip geolocation for local/private IPs
		const isLocalIp =
			ip === '127.0.0.1' ||
			ip.indexOf('192.168.') === 0 ||
			ip.indexOf('10.') === 0 ||
			ip.indexOf('172.') === 0

		if (isLocalIp) {
			return null
		}

		// For demo purposes, returning null. In production, you'd integrate with a service like:
		// - ipapi.co
		// - ipgeolocation.io
		// - MaxMind GeoIP

		// Example integration with ipapi.co (commented out):
		/*
		const response = await fetch(`http://ipapi.co/${ip}/json/`)
		if (response.ok) {
			const data = await response.json()
			return {
				country: data.country_name,
				region: data.region,
				city: data.city,
			}
		}
		*/

		return null
	} catch (error) {
		console.error('Error getting IP geolocation:', error)
		return null
	}
}

export async function blacklistIp(
	ip: string,
	reason: string,
	blacklistedById: string,
): Promise<void> {
	await db
		.insert(IpAddress)
		.values({
			ip,
			isBlacklisted: true,
			blacklistReason: reason,
			blacklistedAt: new Date(),
			blacklistedById,
			requestCount: 0,
		})
		.onConflictDoUpdate({
			target: IpAddress.ip,
			set: {
				isBlacklisted: true,
				blacklistReason: reason,
				blacklistedAt: new Date(),
				blacklistedById,
			},
		})
}

export async function unblacklistIp(ip: string): Promise<void> {
	await db
		.update(IpAddress)
		.set({
			isBlacklisted: false,
			blacklistReason: null,
			blacklistedAt: null,
			blacklistedById: null,
			suspiciousScore: 0, // Reset suspicious score
		})
		.where(eq(IpAddress.ip, ip))
}

export async function isIpBlacklisted(ip: string): Promise<boolean> {
	const [ipRecord] = await db
		.select({ isBlacklisted: IpAddress.isBlacklisted })
		.from(IpAddress)
		.where(eq(IpAddress.ip, ip))
		.limit(1)
	return ipRecord?.isBlacklisted || false
}

// Get IP statistics for admin dashboard
export async function getIpStats() {
	const [stats] = await db
		.select({
			totalIps: sql<number>`count(*)`,
			totalRequests: sql<number>`coalesce(sum(${IpAddress.requestCount}), 0)`,
		})
		.from(IpAddress)
		.where(eq(IpAddress.isBlacklisted, false))
	const [blacklisted] = await db
		.select({ value: sql<number>`count(*)` })
		.from(IpAddress)
		.where(eq(IpAddress.isBlacklisted, true))
	const [suspicious] = await db
		.select({ value: sql<number>`count(*)` })
		.from(IpAddress)
		.where(
			and(gt(IpAddress.suspiciousScore, 0), eq(IpAddress.isBlacklisted, false)),
		)

	return {
		totalIps: stats?.totalIps || 0,
		totalRequests: stats?.totalRequests || 0,
		blacklistedIps: blacklisted?.value || 0,
		suspiciousIps: suspicious?.value || 0,
	}
}

// Get users who have used a specific IP address - for admin use
export async function getUsersByIpAddress(ip: string) {
	return db
		.select({
			id: IpAddressUser.id,
			userId: IpAddressUser.userId,
			ipAddressId: IpAddressUser.ipAddressId,
			firstSeenAt: IpAddressUser.firstSeenAt,
			lastSeenAt: IpAddressUser.lastSeenAt,
			requestCount: IpAddressUser.requestCount,
			user: {
				id: User.id,
				name: User.name,
				username: User.username,
				email: User.email,
				createdAt: User.createdAt,
				isBanned: User.isBanned,
			},
		})
		.from(IpAddressUser)
		.innerJoin(IpAddress, eq(IpAddressUser.ipAddressId, IpAddress.id))
		.innerJoin(User, eq(IpAddressUser.userId, User.id))
		.where(eq(IpAddress.ip, ip))
		.orderBy(IpAddressUser.lastSeenAt)
}

// Get IP addresses used by a specific user - for admin use
export async function getIpAddressesByUser(userId: string) {
	return db
		.select({
			id: IpAddressUser.id,
			userId: IpAddressUser.userId,
			ipAddressId: IpAddressUser.ipAddressId,
			firstSeenAt: IpAddressUser.firstSeenAt,
			lastSeenAt: IpAddressUser.lastSeenAt,
			requestCount: IpAddressUser.requestCount,
			ipAddress: {
				id: IpAddress.id,
				ip: IpAddress.ip,
				country: IpAddress.country,
				region: IpAddress.region,
				city: IpAddress.city,
				isBlacklisted: IpAddress.isBlacklisted,
				suspiciousScore: IpAddress.suspiciousScore,
				createdAt: IpAddress.createdAt,
				lastRequestAt: IpAddress.lastRequestAt,
			},
		})
		.from(IpAddressUser)
		.innerJoin(IpAddress, eq(IpAddressUser.ipAddressId, IpAddress.id))
		.where(eq(IpAddressUser.userId, userId))
		.orderBy(IpAddressUser.lastSeenAt)
}
