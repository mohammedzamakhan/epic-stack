import { getClientIp } from '@repo/security'
import { prisma } from './db.server'

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
		let ipRecord = await prisma.ipAddress.findUnique({
			where: { ip: data.ip },
		})

		if (!ipRecord) {
			// Try to get geolocation data (you can integrate with a service like ipapi.co)
			const geoData = await getIpGeolocation(data.ip)

			ipRecord = await prisma.ipAddress.create({
				data: {
					ip: data.ip,
					country: geoData?.country,
					region: geoData?.region,
					city: geoData?.city,
					requestCount: 1,
					lastRequestAt: new Date(),
					lastUserAgent: data.userAgent,
				},
			})
		} else {
			// Update existing record with simple counting
			const updateData: any = {
				requestCount: { increment: 1 },
				lastRequestAt: new Date(),
			}

			// Update user agent if provided
			if (data.userAgent) {
				updateData.lastUserAgent = data.userAgent
			}

			// Simple suspicious activity detection
			const isHighFrequency = await checkHighFrequencyRequests(data.ip)
			if (isHighFrequency) {
				updateData.suspiciousScore = { increment: 1 }
			}

			await prisma.ipAddress.update({
				where: { ip: data.ip },
				data: updateData,
			})
		}

		// Track user-IP relationship if user is logged in
		if (data.userId) {
			await prisma.ipAddressUser.upsert({
				where: {
					userId_ipAddressId: {
						userId: data.userId,
						ipAddressId: ipRecord.id,
					},
				},
				update: {
					lastSeenAt: new Date(),
					requestCount: { increment: 1 },
				},
				create: {
					userId: data.userId,
					ipAddressId: ipRecord.id,
					firstSeenAt: new Date(),
					lastSeenAt: new Date(),
					requestCount: 1,
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
	await prisma.ipAddress.upsert({
		where: { ip },
		update: {
			isBlacklisted: true,
			blacklistReason: reason,
			blacklistedAt: new Date(),
			blacklistedById,
		},
		create: {
			ip,
			isBlacklisted: true,
			blacklistReason: reason,
			blacklistedAt: new Date(),
			blacklistedById,
			requestCount: 0,
		},
	})
}

export async function unblacklistIp(ip: string): Promise<void> {
	await prisma.ipAddress.update({
		where: { ip },
		data: {
			isBlacklisted: false,
			blacklistReason: null,
			blacklistedAt: null,
			blacklistedById: null,
			suspiciousScore: 0, // Reset suspicious score
		},
	})
}

export async function isIpBlacklisted(ip: string): Promise<boolean> {
	const ipRecord = await prisma.ipAddress.findUnique({
		where: { ip },
		select: { isBlacklisted: true },
	})
	return ipRecord?.isBlacklisted || false
}

// Get IP statistics for admin dashboard
export async function getIpStats() {
	const stats = await prisma.ipAddress.aggregate({
		_count: { _all: true },
		_sum: { requestCount: true },
		where: { isBlacklisted: false },
	})

	const blacklistedCount = await prisma.ipAddress.count({
		where: { isBlacklisted: true },
	})

	const suspiciousCount = await prisma.ipAddress.count({
		where: {
			suspiciousScore: { gt: 0 },
			isBlacklisted: false,
		},
	})

	return {
		totalIps: stats._count._all || 0,
		totalRequests: stats._sum.requestCount || 0,
		blacklistedIps: blacklistedCount,
		suspiciousIps: suspiciousCount,
	}
}

// Get users who have used a specific IP address - for admin use
export async function getUsersByIpAddress(ip: string) {
	const ipRecord = await prisma.ipAddress.findUnique({
		where: { ip },
		include: {
			ipAddressUsers: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							username: true,
							email: true,
							createdAt: true,
							isBanned: true,
						},
					},
				},
				orderBy: {
					lastSeenAt: 'desc',
				},
			},
		},
	})

	return ipRecord?.ipAddressUsers || []
}

// Get IP addresses used by a specific user - for admin use
export async function getIpAddressesByUser(userId: string) {
	const userIpConnections = await prisma.ipAddressUser.findMany({
		where: { userId },
		include: {
			ipAddress: {
				select: {
					id: true,
					ip: true,
					country: true,
					region: true,
					city: true,
					isBlacklisted: true,
					suspiciousScore: true,
					createdAt: true,
					lastRequestAt: true,
				},
			},
		},
		orderBy: {
			lastSeenAt: 'desc',
		},
	})

	return userIpConnections
}
