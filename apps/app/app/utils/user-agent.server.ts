export interface DeviceInfo {
	browserName: string
	browserVersion?: string
	osName: string
	osVersion?: string
	deviceType: 'mobile' | 'tablet' | 'desktop'
	deviceName: string // e.g., "Chrome on macOS"
	operatingSystem: string // e.g., "macOS 14.2"
}

/**
 * Parse user agent string to extract device and browser information
 */
export function parseUserAgent(userAgent: string | null): DeviceInfo {
	if (!userAgent) {
		return {
			browserName: 'Unknown Browser',
			osName: 'Unknown OS',
			deviceType: 'desktop',
			deviceName: 'Unknown Browser',
			operatingSystem: 'Unknown OS',
		}
	}

	// Extract browser info
	const browserInfo = getBrowserInfo(userAgent)
	const osInfo = getOSInfo(userAgent)
	const deviceType = getDeviceType(userAgent)

	return {
		browserName: browserInfo.name,
		browserVersion: browserInfo.version,
		osName: osInfo.name,
		osVersion: osInfo.version,
		deviceType,
		deviceName: `${browserInfo.name}${browserInfo.version ? ` ${browserInfo.version}` : ''} on ${osInfo.name}`,
		operatingSystem: `${osInfo.name}${osInfo.version ? ` ${osInfo.version}` : ''}`,
	}
}

function getBrowserInfo(
	userAgent: string,
): { name: string; version?: string } {
	// Edge (Chromium-based)
	if (userAgent.includes('Edg/')) {
		const match = userAgent.match(/Edg\/(\d+\.\d+)/)
		return { name: 'Edge', version: match?.[1] }
	}

	// Chrome
	if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
		const match = userAgent.match(/Chrome\/(\d+\.\d+)/)
		return { name: 'Chrome', version: match?.[1] }
	}

	// Firefox
	if (userAgent.includes('Firefox/')) {
		const match = userAgent.match(/Firefox\/(\d+\.\d+)/)
		return { name: 'Firefox', version: match?.[1] }
	}

	// Safari (but not Chrome/Edge which also contain Safari in UA)
	if (
		userAgent.includes('Safari/') &&
		!userAgent.includes('Chrome/') &&
		!userAgent.includes('Edg/')
	) {
		const match = userAgent.match(/Version\/(\d+\.\d+)/)
		return { name: 'Safari', version: match?.[1] }
	}

	// Opera
	if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) {
		const match = userAgent.match(/(?:OPR|Opera)\/(\d+\.\d+)/)
		return { name: 'Opera', version: match?.[1] }
	}

	// Internet Explorer
	if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
		const match = userAgent.match(/(?:MSIE |rv:)(\d+\.\d+)/)
		return { name: 'Internet Explorer', version: match?.[1] }
	}

	// Brave (difficult to detect, often appears as Chrome)
	if (userAgent.includes('Brave')) {
		return { name: 'Brave' }
	}

	return { name: 'Unknown Browser' }
}

function getOSInfo(userAgent: string): { name: string; version?: string } {
	// Windows
	if (userAgent.includes('Windows NT')) {
		const match = userAgent.match(/Windows NT (\d+\.\d+)/)
		const version = match?.[1]
		let osVersion = 'Windows'

		// Map Windows NT versions to friendly names
		if (version === '10.0') osVersion = 'Windows 10/11'
		else if (version === '6.3') osVersion = 'Windows 8.1'
		else if (version === '6.2') osVersion = 'Windows 8'
		else if (version === '6.1') osVersion = 'Windows 7'

		return { name: osVersion, version }
	}

	// macOS
	if (userAgent.includes('Mac OS X')) {
		const match = userAgent.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/)
		const version = match?.[1]?.replace(/_/g, '.')
		return { name: 'macOS', version }
	}

	// iOS
	if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
		const match = userAgent.match(/OS (\d+[._]\d+(?:[._]\d+)?)/)
		const version = match?.[1]?.replace(/_/g, '.')
		const device = userAgent.includes('iPad') ? 'iPadOS' : 'iOS'
		return { name: device, version }
	}

	// Android
	if (userAgent.includes('Android')) {
		const match = userAgent.match(/Android (\d+\.\d+)/)
		return { name: 'Android', version: match?.[1] }
	}

	// Linux
	if (userAgent.includes('Linux')) {
		return { name: 'Linux' }
	}

	// Chrome OS
	if (userAgent.includes('CrOS')) {
		return { name: 'Chrome OS' }
	}

	return { name: 'Unknown OS' }
}

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
	// Check for mobile devices
	if (
		/iPhone|iPod|Android.*Mobile|BlackBerry|Opera Mini|IEMobile|Mobile/i.test(
			userAgent,
		)
	) {
		return 'mobile'
	}

	// Check for tablets
	if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) {
		return 'tablet'
	}

	return 'desktop'
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request: Request): string | null {
	return request.headers.get('user-agent')
}

/**
 * Create a device fingerprint based on user agent and IP
 * This can be used to identify unique devices
 */
export function createDeviceFingerprint(
	userAgent: string | null,
	ipAddress: string,
): string {
	const ua = userAgent || 'unknown'
	// Create a simple fingerprint - in production you might want to use a hash
	return `${ipAddress}-${ua.slice(0, 50)}`
}
