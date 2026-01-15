/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

// Mock cache.server.ts to avoid node:sqlite in jsdom - MUST be before imports
vi.mock('#app/utils/cache.server.ts', async () => {
	return {
		cachified: vi.fn(),
		cache: {
			delete: vi.fn(),
			clear: vi.fn(),
		},
	}
})

import { SSOConfigurationForm } from './sso-configuration-form.tsx'

// Mock the Form component from react-router
vi.mock('react-router', () => ({
	Form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
	useActionData: () => undefined,
	useLoaderData: () => undefined,
	useNavigation: () => ({ state: 'idle' }),
}))

// Mock UI components
vi.mock('@repo/ui', () => ({
	Button: ({ children, ...props }: any) => (
		<button {...props}>{children}</button>
	),
	Card: ({ children }: any) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: any) => (
		<div data-testid="card-content">{children}</div>
	),
	CardDescription: ({ children }: any) => (
		<div data-testid="card-description">{children}</div>
	),
	CardHeader: ({ children }: any) => (
		<div data-testid="card-header">{children}</div>
	),
	CardTitle: ({ children }: any) => (
		<div data-testid="card-title">{children}</div>
	),
	Icon: ({ name }: any) => <span data-testid={`icon-${name}`} />,
	Input: (props: any) => <input {...props} />,
	Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
	Switch: (props: any) => <input type="checkbox" {...props} />,
	Textarea: (props: any) => <textarea {...props} />,
	Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
	AlertDescription: ({ children }: any) => (
		<div data-testid="alert-description">{children}</div>
	),
}))

// Mock form components
vi.mock('./forms.tsx', () => ({
	Field: ({ labelProps, inputProps, errors }: any) => (
		<div>
			<label htmlFor={inputProps.id} {...labelProps} />
			<input {...inputProps} />
			{errors && <div data-testid="field-errors">{errors.join(', ')}</div>}
		</div>
	),
	ErrorList: ({ errors }: any) =>
		errors ? <div data-testid="error-list">{errors.join(', ')}</div> : null,
	CheckboxField: ({ labelProps, buttonProps }: any) => (
		<div>
			<input type="checkbox" {...buttonProps} />
			<label htmlFor={buttonProps.id} {...labelProps} />
		</div>
	),
}))

describe('SSOConfigurationForm', () => {
	const defaultProps = {
		organizationId: 'org-123',
		existingConfig: null,
		isSubmitting: false,
		testConnectionResult: null,
	}

	it('renders the form with all required fields', () => {
		render(<SSOConfigurationForm {...defaultProps} />)

		expect(screen.getByLabelText('Provider Name')).toBeInTheDocument()
		expect(screen.getByLabelText('Issuer URL')).toBeInTheDocument()
		expect(screen.getByLabelText('Client ID')).toBeInTheDocument()
		expect(screen.getByLabelText('Client Secret')).toBeInTheDocument()
		expect(screen.getByLabelText('Scopes')).toBeInTheDocument()
	})

	it('displays configuration sections', () => {
		render(<SSOConfigurationForm {...defaultProps} />)

		expect(
			screen.getByText('Identity Provider Configuration'),
		).toBeInTheDocument()
		expect(screen.getByText('OAuth2 Configuration')).toBeInTheDocument()
		expect(screen.getByText('User Provisioning')).toBeInTheDocument()
	})

	it('shows manual endpoint fields when auto-discovery is disabled', async () => {
		const user = userEvent.setup()
		render(<SSOConfigurationForm {...defaultProps} />)

		// Find the first checkbox (auto-discovery) since they don't have accessible names
		const checkboxes = screen.getAllByRole('checkbox')
		const autoDiscoveryToggle = checkboxes[0] // First checkbox should be auto-discovery

		// Verify it's initially checked (auto-discovery enabled by default)
		expect(autoDiscoveryToggle).toBeChecked()

		// Click to disable auto-discovery
		await user.click(autoDiscoveryToggle!)

		// Wait for the component to update and check if manual fields appear
		// The manual fields should now be visible since auto-discovery is disabled
		expect(screen.getByLabelText('Authorization URL')).toBeInTheDocument()
		expect(screen.getByLabelText('Token URL')).toBeInTheDocument()
		expect(screen.getByLabelText('UserInfo URL')).toBeInTheDocument()
		expect(
			screen.getByLabelText('Revocation URL (Optional)'),
		).toBeInTheDocument()
	})

	it('populates form with existing configuration data', () => {
		const existingConfig = {
			id: 'config-123',
			providerName: 'Okta',
			issuerUrl: 'https://dev-123.okta.com',
			clientId: 'client-123',
			clientSecret: 'secret-123',
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			isEnabled: true,
			lastTested: new Date(),
		}

		render(
			<SSOConfigurationForm
				{...defaultProps}
				existingConfig={existingConfig}
			/>,
		)

		expect(screen.getByDisplayValue('Okta')).toBeInTheDocument()
		expect(
			screen.getByDisplayValue('https://dev-123.okta.com'),
		).toBeInTheDocument()
		expect(screen.getByDisplayValue('client-123')).toBeInTheDocument()
		expect(screen.getByDisplayValue('secret-123')).toBeInTheDocument()
	})

	it('displays test connection result when provided', () => {
		const testResult = {
			success: true,
			message: 'Connection successful',
		}

		render(
			<SSOConfigurationForm
				{...defaultProps}
				testConnectionResult={testResult}
			/>,
		)

		// The component uses custom styling instead of Alert component
		expect(screen.getByText('Connection successful')).toBeInTheDocument()
	})

	it('displays error test connection result', () => {
		const testResult = {
			success: false,
			message: 'Connection failed: Invalid credentials',
		}

		render(
			<SSOConfigurationForm
				{...defaultProps}
				testConnectionResult={testResult}
			/>,
		)

		// The component uses custom styling instead of Alert component
		expect(
			screen.getByText('Connection failed: Invalid credentials'),
		).toBeInTheDocument()
	})

	it('shows submitting state when isSubmitting is true', () => {
		render(<SSOConfigurationForm {...defaultProps} isSubmitting={true} />)

		expect(screen.getByText('Saving...')).toBeInTheDocument()
		expect(screen.getByText('Testing...')).toBeInTheDocument()
	})

	it('shows enable/disable button for existing configuration', () => {
		const existingConfig = {
			id: 'config-123',
			providerName: 'Okta',
			issuerUrl: 'https://dev-123.okta.com',
			clientId: 'client-123',
			clientSecret: 'secret-123',
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			isEnabled: true,
			lastTested: new Date(),
		}

		render(
			<SSOConfigurationForm
				{...defaultProps}
				existingConfig={existingConfig}
			/>,
		)

		expect(screen.getByText('Disable SSO')).toBeInTheDocument()
	})

	it('validates required fields', async () => {
		const user = userEvent.setup()
		render(<SSOConfigurationForm {...defaultProps} />)

		// Try to submit without filling required fields
		const saveButton = screen.getByText('Save Configuration')
		await user.click(saveButton)

		// Form validation should prevent submission
		// Note: Actual validation is handled by Conform/Zod, this tests the form structure
		expect(screen.getByLabelText('Provider Name')).toBeRequired()
		expect(screen.getByLabelText('Issuer URL')).toBeRequired()
		expect(screen.getByLabelText('Client ID')).toBeRequired()
		expect(screen.getByLabelText('Client Secret')).toBeRequired()
	})

	it('includes proper form inputs for submission', () => {
		render(<SSOConfigurationForm {...defaultProps} />)

		// Check for hidden organization ID input
		const orgIdInput = document.querySelector('input[name="organizationId"]')
		expect(orgIdInput).toBeInTheDocument()
		expect(orgIdInput).toHaveValue('org-123')
	})

	it('shows update button text for existing configuration', () => {
		const existingConfig = {
			id: 'config-123',
			providerName: 'Okta',
			issuerUrl: 'https://dev-123.okta.com',
			clientId: 'client-123',
			clientSecret: 'secret-123',
			scopes: 'openid email profile',
			autoDiscovery: true,
			pkceEnabled: true,
			autoProvision: true,
			defaultRole: 'member',
			attributeMapping: null,
			authorizationUrl: null,
			tokenUrl: null,
			userinfoUrl: null,
			revocationUrl: null,
			isEnabled: false,
			lastTested: null,
		}

		render(
			<SSOConfigurationForm
				{...defaultProps}
				existingConfig={existingConfig}
			/>,
		)

		expect(screen.getByText('Update Configuration')).toBeInTheDocument()
		expect(screen.getByText('Enable SSO')).toBeInTheDocument()
	})

	it('handles attribute mapping textarea', async () => {
		const user = userEvent.setup()
		render(<SSOConfigurationForm {...defaultProps} />)

		const attributeMappingTextarea = screen.getByLabelText(
			'Attribute Mapping (JSON)',
		)

		// Use paste instead of type to avoid issues with special characters
		await user.click(attributeMappingTextarea)
		await user.paste('{"email": "email", "name": "name"}')

		expect(attributeMappingTextarea).toHaveValue(
			'{"email": "email", "name": "name"}',
		)
	})
})
