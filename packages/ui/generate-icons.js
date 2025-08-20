import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isWatchMode = process.argv.includes('--watch')

async function generateIcons() {
	console.log('Generating icon sprite and types...')
	
	const inputDir = path.join(__dirname, 'other', 'svg-icons')
	const outputDir = path.join(__dirname, '..', '..', 'apps', 'web', 'app', 'components', 'ui', 'icons')
	const duplicateOutputDir = path.join(__dirname, 'components', 'icons')
	
	// Create the output directory if it doesn't exist
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true })
	}

	if (!fs.existsSync(duplicateOutputDir)) {
		fs.mkdirSync(duplicateOutputDir, { recursive: true })
	}
	
	// Read all SVG files
	const svgFiles = fs.readdirSync(inputDir).filter(file => file.endsWith('.svg') && file !== 'README.md')
	
	// Generate sprite SVG content
	const symbols = []
	const iconNames = []
	
	for (const file of svgFiles) {
		const iconName = path.basename(file, '.svg')
		const svgContent = fs.readFileSync(path.join(inputDir, file), 'utf8')
		
		// Extract the content inside the SVG tag
		const match = svgContent.match(/<svg[^>]*>(.*?)<\/svg>/s)
		if (match) {
			const innerContent = match[1]
			symbols.push(`<symbol id="${iconName}" ${svgContent.match(/viewBox="[^"]*"/)?.[0] || 'viewBox="0 0 24 24"'}>${innerContent}</symbol>`)
			iconNames.push(iconName)
		}
	}
	
	// Generate the sprite SVG
	const spriteContent = `<svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
${symbols.join('\n')}
</svg>`
	
	// Write sprite file
	const spriteFilePath = path.join(outputDir, 'sprite.svg')
	fs.writeFileSync(spriteFilePath, spriteContent, 'utf8')

	// Write duplicate sprite file
	const duplicateSpriteFilePath = path.join(duplicateOutputDir, 'sprite.svg')
	fs.writeFileSync(duplicateSpriteFilePath, spriteContent, 'utf8')
	
	// Generate TypeScript types
	const typesContent = `export type IconName = ${iconNames.map(name => `'${name}'`).join(' | ')}`
	
	const typesFilePath = path.join(outputDir, 'icon-name.d.ts')
	fs.writeFileSync(typesFilePath, typesContent, 'utf8')

	// Write duplicate types file
	const duplicateTypesFilePath = path.join(duplicateOutputDir, 'icon-name.d.ts')
	fs.writeFileSync(duplicateTypesFilePath, typesContent, 'utf8')
	
	// Generate index file
	const indexContent = `export type { IconName } from './icon-name'
export { default as spriteUrl } from './sprite.svg?url'`
	
	const indexFilePath = path.join(outputDir, 'index.ts')
	fs.writeFileSync(indexFilePath, indexContent, 'utf8')
	
	// Write duplicate index file
	const duplicateIndexFilePath = path.join(duplicateOutputDir, 'index.ts')
	fs.writeFileSync(duplicateIndexFilePath, indexContent, 'utf8')

	console.log(`✅ Icons generated successfully! Generated ${iconNames.length} icons:`)
	console.log(iconNames.join(', '))
}

async function main() {
	try {
		await generateIcons()
		
		if (isWatchMode) {
			console.log('👀 Watching for changes in other/svg-icons/...')
			
			const inputDir = path.join(__dirname, 'other', 'svg-icons')
			
			// Watch for file changes
			fs.watch(inputDir, { recursive: false }, async (eventType, filename) => {
				if (filename && filename.endsWith('.svg')) {
					console.log(`\n🔄 Detected ${eventType} on ${filename}, regenerating icons...`)
					try {
						await generateIcons()
						console.log('👀 Watching for changes in other/svg-icons/...')
					} catch (error) {
						console.error('❌ Failed to regenerate icons:', error)
					}
				}
			})
			
			console.log('Press Ctrl+C to stop watching')
			
			// Keep the process alive
			process.on('SIGINT', () => {
				console.log('\n✅ Stopped watching icons')
				process.exit(0)
			})
			
			// Prevent the script from exiting
			await new Promise(() => {})
		}
	} catch (error) {
		console.error('❌ Failed to generate icons:', error)
		process.exit(1)
	}
}

main()