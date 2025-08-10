import { prisma } from '../packages/prisma/index'

async function testIpTracking() {
	console.log('Testing IP tracking functionality...')
	
	// Test 1: Check if schema was applied correctly
	try {
		const ipCount = await prisma.ipAddress.count()
		console.log(`✅ Database connection working. Found ${ipCount} IP addresses`)
	} catch (error) {
		console.error('❌ Database connection failed:', error)
		return
	}
	
	// Test 2: Create a test IP address
	try {
		const testIp = await prisma.ipAddress.create({
			data: {
				ip: '192.168.1.100',
				country: 'United States',
				region: 'California',
				city: 'San Francisco',
			}
		})
		console.log(`✅ Created test IP address: ${testIp.ip}`)
		
		// Test 3: Create some request logs
		await prisma.ipRequestLog.createMany({
			data: [
				{
					ipId: testIp.id,
					method: 'GET',
					path: '/admin',
					userAgent: 'Mozilla/5.0 (test)',
					statusCode: 200,
				},
				{
					ipId: testIp.id,
					method: 'POST',
					path: '/login',
					userAgent: 'Mozilla/5.0 (test)',
					statusCode: 200,
				}
			]
		})
		console.log('✅ Created test request logs')
		
		// Test 4: Query with aggregations (like the admin page would)
		const ipWithStats = await prisma.ipAddress.findUnique({
			where: { id: testIp.id },
			include: {
				_count: {
					select: {
						requests: true,
					}
				},
				requests: {
					select: {
						createdAt: true,
						method: true,
						path: true,
					},
					orderBy: { createdAt: 'desc' },
					take: 5,
				}
			}
		})
		
		console.log(`✅ IP ${ipWithStats?.ip} has ${ipWithStats?._count.requests} requests`)
		console.log('Recent requests:', ipWithStats?.requests.map(r => `${r.method} ${r.path}`).join(', '))
		
	} catch (error) {
		console.error('❌ Error creating test data:', error)
	}
	
	console.log('🎉 IP tracking test completed!')
}

testIpTracking().catch(console.error).finally(() => process.exit(0))
