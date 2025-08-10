import { prisma } from './index.ts'

async function seedIpData() {
	console.log('Seeding IP address test data...')

	// Create some test IP addresses
	const testIps = [
		{
			ip: '192.168.1.100',
			country: 'United States',
			region: 'California',
			city: 'San Francisco',
		},
		{
			ip: '10.0.0.50',
			country: 'United Kingdom',
			region: 'England',
			city: 'London',
		},
		{
			ip: '203.0.113.1',
			country: 'Australia',
			region: 'New South Wales',
			city: 'Sydney',
		},
		{
			ip: '198.51.100.42',
			country: 'Canada',
			region: 'Ontario',
			city: 'Toronto',
		},
		{
			ip: '203.0.113.254',
			country: 'Germany',
			region: 'Bavaria',
			city: 'Munich',
			isBlacklisted: true,
			blacklistReason: 'Suspicious activity detected',
			blacklistedAt: new Date(),
		},
	]

	for (const ipData of testIps) {
		const ipAddress = await prisma.ipAddress.create({
			data: ipData,
		})

		// Create some test request logs for each IP
		const requestCount = Math.floor(Math.random() * 20) + 1
		for (let i = 0; i < requestCount; i++) {
			await prisma.ipRequestLog.create({
				data: {
					ipId: ipAddress.id,
					method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
					path: ['/', '/app', '/admin', '/api/users', '/login'][Math.floor(Math.random() * 5)],
					userAgent: 'Mozilla/5.0 (Test Browser)',
					statusCode: [200, 201, 404, 500][Math.floor(Math.random() * 4)],
					createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
				},
			})
		}

		console.log(`Created IP ${ipAddress.ip} with ${requestCount} requests`)
	}

	console.log('IP address test data seeded successfully!')
}

seedIpData().catch(console.error)
