import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedOrganizations() {
	console.log('🏢 Seeding organizations...')
	console.time(`🏢 Organizations have been seeded`)

	// Get existing users
	const users = await prisma.user.findMany({
		select: { id: true },
		take: 5,
	})

	if (!users.length) {
		console.log('No users found to assign to organizations')
		return
	}

	// Create organizations
	const orgCount = 3
	for (let i = 0; i < orgCount; i++) {
		const name = faker.company.name()
		// Create a unique slug
		const baseSlug = name
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '-')
			.replace(/-+/g, '-')
		const slug = `${baseSlug}-${faker.string.alphanumeric(4)}`

		try {
			// Delete organization if it exists (for demo purposes)
			const existingOrg = await prisma.organization.findUnique({
				where: { slug },
			})

			if (existingOrg) {
				await prisma.organization.delete({
					where: { id: existingOrg.id },
				})
			}

			const organization = await prisma.organization.create({
				data: {
					name,
					slug,
					description: faker.company.catchPhrase(),
					active: true,
				},
			})

			console.log(`Created organization: ${organization.name}`)

			// Assign random users as members
			const adminUser = users[0] // First user is admin
			const memberUsers = users.slice(1) // Rest are regular members

			if (adminUser) {
				// Add admin user
				await prisma.userOrganization.create({
					data: {
						userId: adminUser.id,
						organizationId: organization.id,
						role: 'admin',
						isDefault: i === 0, // First org is default for admin
					},
				})
			}

			// Add some members
			for (const user of memberUsers) {
				if (Math.random() > 0.3) {
					// 70% chance to add each user
					await prisma.userOrganization.create({
						data: {
							userId: user.id,
							organizationId: organization.id,
							role: Math.random() > 0.7 ? 'admin' : 'member',
							isDefault: false,
						},
					})
				}
			}
		} catch (error) {
			console.error(`Error creating organization: ${error}`)
		}
	}

	// Ensure each user has a default organization
	for (const user of users) {
		const userOrgs = await prisma.userOrganization.findMany({
			where: { userId: user.id },
			orderBy: { createdAt: 'asc' },
		})

		if (userOrgs.length > 0 && !userOrgs.some((org: any) => org.isDefault)) {
			await prisma.userOrganization.update({
				where: {
					userId_organizationId: {
						userId: user.id,
						organizationId: userOrgs[0]!.organizationId,
					},
				},
				data: { isDefault: true },
			})
		}
	}

	console.timeEnd(`🏢 Organizations have been seeded`)
}

async function seedWebsitePages() {
	console.log('📄 Seeding website pages...')
	console.time('📄 Website pages have been seeded')

	const organizations = await prisma.organization.findMany({
		select: { id: true, name: true },
	})

	const users = await prisma.user.findMany({
		select: { id: true },
		take: 1,
	})

	const creatorId = users[0]?.id
	if (!creatorId) {
		console.log('No users found to assign as page creators')
		return
	}

	for (const org of organizations) {
		// Skip if pages already exist
		const existingPages = await prisma.websitePage.count({
			where: { organizationId: org.id },
		})
		if (existingPages > 0) continue

		try {
			const siteHeaderConfig = JSON.stringify({
				navLinks: [
					{ label: 'About', url: '/about' },
					{ label: 'FAQ', url: '/faq' },
				],
				ctaLabel: 'Get in touch',
				ctaUrl: '/about',
				showCta: true,
				showName: true,
				sticky: true,
			})
			const siteFooterConfig = JSON.stringify({
				columns: [
					{
						title: 'Explore',
						links: [
							{ label: 'About', url: '/about' },
							{ label: 'FAQ', url: '/faq' },
						],
					},
				],
				ctaLabel: 'Get in touch',
				ctaUrl: '/about',
				showCta: true,
				socials: [],
				copyright: '',
			})

			await prisma.organization.update({
				where: { id: org.id },
				data: { siteHeaderConfig, siteFooterConfig },
			})

			// Home page
			await prisma.websitePage.create({
				data: {
					organizationId: org.id,
					title: 'Home',
					slug: '',
					status: 'published',
					template: 'showcase',
					isHomePage: true,
					position: 0,
					createdById: creatorId,
					sections: {
						create: [
							{
								type: 'hero',
								position: 0,
								config: JSON.stringify({
									heading: `Welcome to ${org.name}`,
									subheading: 'A place built around the details that matter',
									links: [{ url: '/about', link: { label: 'Learn More' } }],
									assetType: 'image',
									assetPosition: 'background',
									textPosition: 'left',
									overlay: 'dark',
									minHeight: 560,
									imageUrl: '',
								}),
							},
							{
								type: 'content',
								position: 1,
								config: JSON.stringify({
									title: 'Why Choose Us',
									body: 'Our experienced team delivers exceptional results with a focus on quality, care, and consistency.',
									layout: 'split',
									imagePosition: 'left',
									imageShape: 'rounded',
									background: 'none',
									ctaLabel: 'Our story',
									ctaUrl: '/about',
								}),
							},
							{
								type: 'testimonials',
								position: 2,
								config: JSON.stringify({
									title: 'What people say',
									items: [
										{
											quote: 'An outstanding experience from start to finish.',
											name: 'Alex Rivera',
											rating: 5,
										},
										{
											quote: 'Warm, thoughtful, and consistently excellent.',
											name: 'Jordan Lee',
											rating: 5,
										},
										{
											quote: 'We keep coming back — it never misses.',
											name: 'Sam Patel',
											rating: 5,
										},
									],
								}),
							},
							{
								type: 'cta',
								position: 3,
								config: JSON.stringify({
									heading: 'Ready to get started?',
									description: 'Join thousands of satisfied customers today.',
									variant: 'solid',
									cardPosition: 'left',
									primaryLabel: 'Get Started',
									primaryUrl: '/about',
								}),
							},
						],
					},
				},
			})

			// About Us page
			await prisma.websitePage.create({
				data: {
					organizationId: org.id,
					title: 'About Us',
					slug: 'about',
					status: 'published',
					template: 'article',
					position: 1,
					createdById: creatorId,
					sections: {
						create: [
							{
								type: 'hero',
								position: 0,
								config: JSON.stringify({
									heading: `About ${org.name}`,
									subheading: 'Our story, mission, and values',
									links: [],
									assetType: 'image',
									assetPosition: 'background',
									textPosition: 'left',
									overlay: 'dark',
									minHeight: 420,
									imageUrl: '',
								}),
							},
							{
								type: 'content',
								position: 1,
								config: JSON.stringify({
									title: 'Our Mission',
									subtitle: '',
									body: `${org.name} was founded with a simple mission: to deliver exceptional value to our customers through innovation, quality, and dedication. We believe that every business deserves access to world-class tools and support.\n\nOur team of passionate professionals works tirelessly to ensure that our products and services exceed expectations. We are committed to continuous improvement and staying at the forefront of industry trends.`,
									layout: 'split',
									imagePosition: 'right',
									imageShape: 'rounded',
								}),
							},
						],
					},
				},
			})

			// FAQ page (draft)
			await prisma.websitePage.create({
				data: {
					organizationId: org.id,
					title: 'FAQ',
					slug: 'faq',
					status: 'draft',
					template: 'article',
					position: 2,
					createdById: creatorId,
					sections: {
						create: [
							{
								type: 'hero',
								position: 0,
								config: JSON.stringify({
									heading: 'Frequently Asked Questions',
									subheading: 'Find answers to common questions',
									links: [],
									assetType: 'none',
									textPosition: 'center',
									overlay: 'none',
									minHeight: 280,
								}),
							},
							{
								type: 'faq',
								position: 1,
								config: JSON.stringify({
									title: 'Common Questions',
									subtitle: '',
									items: [
										{
											question: 'How do I get started?',
											answer:
												'Simply create an account and follow our onboarding guide to get up and running in minutes.',
										},
										{
											question: 'What payment methods do you accept?',
											answer:
												'We accept all major credit cards, PayPal, and bank transfers for enterprise accounts.',
										},
										{
											question: 'Can I cancel my subscription?',
											answer:
												'Yes, you can cancel your subscription at any time from your account settings. No questions asked.',
										},
										{
											question: 'Do you offer customer support?',
											answer:
												'Absolutely! Our support team is available 24/7 via email, chat, and phone.',
										},
									],
								}),
							},
						],
					},
				},
			})

			console.log(`  Created website pages for: ${org.name}`)
		} catch (error) {
			console.error(`  Error creating pages for ${org.name}: ${error}`)
		}
	}

	console.timeEnd('📄 Website pages have been seeded')
}

seedOrganizations()
	.then(() => seedWebsitePages())
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
