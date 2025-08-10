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

export function getClientIp(request: any): string {
	// Check various headers for the real IP address
	const forwarded = request.get('X-Forwarded-For')
	const realIp = request.get('X-Real-IP')
	const flyClientIp = request.get('Fly-Client-IP')
	const cfConnectingIp = request.get('CF-Connecting-IP')

	// Prefer more reliable headers first
	if (flyClientIp) return flyClientIp
	if (cfConnectingIp) return cfConnectingIp
	if (realIp) return realIp
	if (forwarded) {
		// X-Forwarded-For can contain multiple IPs, take the first one
		return forwarded.split(',')[0]?.trim() || request.ip
	}

	return request.ip || '127.0.0.1'
}

export async function trackIpRequest(data: IpTrackingData): Promise<void> {
	try {
		// Skip tracking for certain paths
		const skipPaths = [
			'/assets/',
			'/resources/images',
			'/resources/healthcheck',
			'/favicon.ico',
			'/site.webmanifest',
		]

		const shouldSkip = skipPaths.some(path => data.path.indexOf(path) === 0)
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
				},
			})
		}

		// Check if IP is blacklisted
		if (ipRecord.isBlacklisted) {
			// You might want to handle blacklisted IPs differently
			console.log(`Blacklisted IP ${data.ip} attempted to access ${data.path}`)
		}

		// Log the request
		await prisma.ipRequestLog.create({
			data: {
				ipId: ipRecord.id,
				method: data.method,
				path: data.path,
				userAgent: data.userAgent,
				referer: data.referer,
				statusCode: data.statusCode,
				userId: data.userId,
			},
		})
	} catch (error) {
		// Don't let IP tracking errors break the application
		console.error('Error tracking IP request:', error)
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
		const isLocalIp = ip === '127.0.0.1' || 
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
	blacklistedById: string
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
