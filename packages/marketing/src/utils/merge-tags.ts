export function interpolateMergeTags(
	template: string,
	vars: Record<string, string | null | undefined>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
		const value = vars[key]
		return value != null && value !== '' ? value : ''
	})
}

export function buildRecipientMergeTags(recipient: {
	name?: string | null
	email?: string | null
	phone?: string | null
	organizationName?: string | null
}) {
	const displayName = recipient.name || recipient.email || 'there'
	const firstName = displayName.split(/\s+/)[0] || displayName

	return {
		name: displayName,
		firstName,
		email: recipient.email || '',
		phone: recipient.phone || '',
		organizationName: recipient.organizationName || '',
	}
}
