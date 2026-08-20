import {
	and,
	asc,
	db,
	eq,
	isNull,
	WebsitePage,
	WebsitePageSection,
} from '@repo/database'

async function main() {
	const pages = await db
		.select()
		.from(WebsitePage)
		.where(
			and(
				eq(WebsitePage.status, 'published'),
				isNull(WebsitePage.publishedData),
			),
		)

	for (const page of pages) {
		const sections = await db
			.select({
				id: WebsitePageSection.id,
				type: WebsitePageSection.type,
				position: WebsitePageSection.position,
				config: WebsitePageSection.config,
			})
			.from(WebsitePageSection)
			.where(eq(WebsitePageSection.pageId, page.id))
			.orderBy(asc(WebsitePageSection.position))

		await db
			.update(WebsitePage)
			.set({ publishedData: JSON.stringify(sections) })
			.where(eq(WebsitePage.id, page.id))
		console.log(`Snapshotted page: ${page.slug}`)
	}
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
