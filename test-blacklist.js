// Quick script to test IP blacklisting
// Run with: node test-blacklist.js

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testBlacklist() {
	try {
		// Blacklist localhost for testing
		const testIp = '127.0.0.1'
		
		await prisma.ipAddress.upsert({
			where: { ip: testIp },
			update: {
				isBlacklisted: true,
				blacklistReason: 'Testing IP blacklist functionality',
				blacklistedAt: new Date(),
			},
			create: {
				ip: testIp,
				isBlacklisted: true,
				blacklistReason: 'Testing IP blacklist functionality',
				blacklistedAt: new Date(),
			},
		})
		
		console.log(`✅ IP ${testIp} has been blacklisted for testing`)
		console.log('Now try accessing the website - you should be blocked!')
		console.log('To remove the blacklist, run: node test-blacklist.js remove')
		
	} catch (error) {
		console.error('Error:', error)
	} finally {
		await prisma.$disconnect()
	}
}

async function removeBlacklist() {
	try {
		const testIp = '127.0.0.1'
		
		await prisma.ipAddress.update({
			where: { ip: testIp },
			data: {
				isBlacklisted: false,
				blacklistReason: null,
				blacklistedAt: null,
			},
		})
		
		console.log(`✅ IP ${testIp} has been removed from blacklist`)
		
	} catch (error) {
		console.error('Error:', error)
	} finally {
		await prisma.$disconnect()
	}
}

const action = process.argv[2]
if (action === 'remove') {
	removeBlacklist()
} else {
	testBlacklist()
}
