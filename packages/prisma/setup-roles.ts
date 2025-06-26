import { prisma } from '@repo/prisma'

async function setupRoles() {
  console.log('Setting up roles...')
  
  // Create user role if it doesn't exist
  const existingUserRole = await prisma.role.findUnique({
    where: { name: 'user' },
  })
  
  if (!existingUserRole) {
    await prisma.role.create({
      data: {
        name: 'user',
        description: 'Regular user with basic permissions',
      },
    })
    console.log('Created user role')
  }
  
  // Create admin role if it doesn't exist
  const existingAdminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  })
  
  if (!existingAdminRole) {
    await prisma.role.create({
      data: {
        name: 'admin',
        description: 'Admin with full permissions',
      },
    })
    console.log('Created admin role')
  }
  
  console.log('Roles setup complete')
}

setupRoles()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })