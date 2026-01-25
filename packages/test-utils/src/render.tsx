import { i18n, I18nProvider } from '@repo/i18n'
import { type ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'

// Setup i18n for tests with empty locale
i18n.loadAndActivate({ locale: 'en', messages: {} })

/**
 * Custom render function that wraps components with I18nProvider for Lingui support.
 * Use this instead of the standard render function when testing components that use
 * useLingui() hook or <Trans> component.
 *
 * @example
 * import { renderWithI18n } from '@repo/test-utils/render'
 *
 * test('renders component', () => {
 *   renderWithI18n(<MyComponent />)
 *   expect(screen.getByText('Hello')).toBeInTheDocument()
 * })
 */
export function renderWithI18n(
	ui: ReactElement,
	options?: Omit<RenderOptions, 'wrapper'>,
) {
	return render(ui, {
		wrapper: ({ children }) => (
			<I18nProvider i18n={i18n}>{children}</I18nProvider>
		),
		...options,
	})
}
