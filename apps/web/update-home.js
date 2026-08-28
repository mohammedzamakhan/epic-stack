import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

const db = new Database('.emdash/data.db')

function generateKey() {
	return crypto.randomBytes(4).toString('hex')
}

const blockTypes = [
	'marketing.hero',
	'marketing.logos',
	'marketing.showcaseCards',
	'marketing.capabilityGrid',
	'marketing.beliefs',
	'marketing.stickyShowcase',
	'marketing.features',
	'marketing.featureList',
	'marketing.featured',
	'marketing.pricing',
	'marketing.testimonials',
	'marketing.testimonialHighlight',
	'marketing.faq',
	'marketing.statsGrid',
	'marketing.stats',
	'marketing.integration',
	'marketing.tabs',
	'marketing.stickyCards',
	'marketing.founderNote',
	'marketing.scrollHighlight',
	'marketing.buildFor',
	'marketing.team',
	'marketing.formBlock',
	'marketing.mediaBlock',
	'marketing.blog',
	'marketing.content',
	'marketing.archive',
	'marketing.cta',
]

const newBlocks = blockTypes.map((type) => ({
	_type: type,
	_key: generateKey(),
	id: '',
}))

try {
	const stmt = db.prepare(
		"SELECT content FROM ec_pages WHERE slug = 'home' LIMIT 1",
	)
	const row = stmt.get()

	if (row) {
		let existingContent = []
		try {
			if (row.content) {
				existingContent = JSON.parse(row.content)
			}
		} catch (e) {}

		// We can replace the content entirely with the new blocks, or prepend/append.
		// Let's replace the whole content to give a clean "kitchen sink" example
		// of every block, as requested by the user.

		const updateStmt = db.prepare(
			"UPDATE ec_pages SET content = ? WHERE slug = 'home'",
		)
		updateStmt.run(JSON.stringify(newBlocks))

		console.log('Successfully updated home page with 27 block types!')
	} else {
		console.error("Could not find page with slug 'home'")
	}
} catch (e) {
	console.error('Error connecting to db or running query:', e)
}

db.close()
