import fs from 'fs'

const path = './src/plugins/marketing-blocks/index.ts'
let code = fs.readFileSync(path, 'utf8')

const fieldsToChange = [
	'mediaUrl',
	'imageUrl',
	'backgroundImageUrl',
	'avatar',
	'logo',
]

for (const field of fieldsToChange) {
	const regex1 = new RegExp(
		`\\{\\s*type:\\s*'text_input',\\s*action_id:\\s*'${field}',\\s*label:\\s*'([^']+)'\\s*\\}`,
		'g',
	)
	code = code.replace(
		regex1,
		`{ type: 'media_picker', action_id: '${field}', label: '$1' }`,
	)

	const regex2 = new RegExp(
		`type:\\s*'text_input',(\\s*)action_id:\\s*'${field}',`,
		'g',
	)
	code = code.replace(regex2, `type: 'media_picker',$1action_id: '${field}',`)
}

fs.writeFileSync(path, code)
console.log('Fixed media pickers!')
