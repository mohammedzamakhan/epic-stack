import { vi } from 'vitest'

function mockMsg(
	strings: TemplateStringsArray,
	...values: Array<string | number>
) {
	let message = strings[0] ?? ''
	for (let i = 0; i < values.length; i++) {
		message = message.replace(`{${i}}`, String(values[i]))
	}

	return {
		id: message,
		message,
	}
}

vi.mock('@lingui/macro', () => ({
	msg: mockMsg,
	Trans: ({ children }: { children?: React.ReactNode }) => children,
	Plural: ({
		value,
		one,
		other,
	}: {
		value: number
		one?: string
		other?: string
	}) => (value === 1 ? one : other)?.replace('#', String(value)),
}))

vi.mock('@lingui/react', () => ({
	useLingui: () => ({
		_: (descriptor: { message?: string }) => descriptor.message ?? '',
		i18n: { locale: 'en' },
	}),
	I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}))
