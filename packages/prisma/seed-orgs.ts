import { faker } from '@faker-js/faker'
import { prisma } from '@repo/prisma'

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
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
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

      // Add admin user
      await prisma.userOrganization.create({
        data: {
          userId: adminUser.id,
          organizationId: organization.id,
          role: 'admin',
          isDefault: i === 0, // First org is default for admin
        },
      })

      // Add some members
      for (const user of memberUsers) {
        if (Math.random() > 0.3) { // 70% chance to add each user
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

    if (userOrgs.length > 0 && !userOrgs.some(org => org.isDefault)) {
      await prisma.userOrganization.update({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: userOrgs[0].organizationId,
          },
        },
        data: { isDefault: true },
      })
    }
  }

  console.timeEnd(`🏢 Organizations have been seeded`)
}

seedOrganizations()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })