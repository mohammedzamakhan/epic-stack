import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const pages = await prisma.websitePage.findMany({
    where: {
      status: 'published',
      publishedData: null,
    },
    include: {
      sections: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          type: true,
          position: true,
          config: true,
        },
      }
    }
  })

  for (const page of pages) {
    await prisma.websitePage.update({
      where: { id: page.id },
      data: {
        publishedData: JSON.stringify(page.sections),
      },
    })
    console.log(`Snapshotted page: ${page.slug}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
