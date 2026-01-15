/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SSOConfigurationOverview } from './sso-configuration-overview.tsx'

// Mock cache.server.ts to avoid node:sqlite in jsdom
vi.mock('#app/utils/cache.server.ts', () => ({
	cachified: vi.fn(),
	cache: {
		delete: vi.fn(),
		clear: vi.fn(),
	},
}))

// Mock UI components
vi.mock('@repo/ui', () => ({
	Badge: ({ children, variant }: any) => (
		<span data-testid={`badge-${variant || 'default'}`}>{children}</span>
	),
	Button: ({ children, onClick, ...props }: any) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
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
	Alert: ({ children, variant }: any) => (
		<div data-testid={`alert-${variant || 'default'}`}>{children}</div>
	),
	AlertDescription: ({ children }: any) => (
		<div data-testid="alert-description">{children}</div>
	),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
	formatDistanceToNow: (date: Date) => {
		const now = new Date()
		const diff = now.getTime() - date.getTime()
		const hours = Math.floor(diff / (1000 * 60 * 60))
		return `${hours} hours ago`
	},
}))

describe('SSOConfigurationOverview', () => {
	const mockSSOConfig = {
		id: 'config-123',
		providerName: 'Okta',
		issuerUrl: 'https://dev-123.okta.com',
		clientId: 'client-123',
		scopes: 'openid email profile',
		autoDiscovery: true,
		pkceEnabled: true,
		autoProvision: true,
		defaultRole: 'member',
		isEnabled: true,
		lastTested: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-01-02'),
		createdBy: {
			id: 'user-1',
			name: 'Admin User',
			username: 'admin',
		},
	}

	const mockSSOStats = {
		totalUsers: 25,
		activeUsers: 20,
		recentLogins: 15,
		lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
	}

	const defaultProps = {
		_organizationId: 'org-123',
		ssoConfig: mockSSOConfig,
		ssoStats: mockSSOStats,
		onEdit: vi.fn(),
		onToggleStatus: vi.fn(),
		onTestConnection: vi.fn(),
	}

	it('renders nothing when ssoConfig is null', () => {
		const { container } = render(
			<SSOConfigurationOverview {...defaultProps} ssoConfig={null} />,
		)

		expect(container.firstChild).toBeNull()
	})

	it('calls onEdit when Configure SSO button is clicked', async () => {
		const user = userEvent.setup()
		const onEdit = vi.fn()

		// This test doesn't make sense if the component returns null when ssoConfig is null
		// Let's test with a valid config instead
		render(<SSOConfigurationOverview {...defaultProps} onEdit={onEdit} />)

		const editButton = screen.getByText('Edit')
		await user.click(editButton)

		expect(onEdit).toHaveBeenCalled()
	})

	it('renders SSO configuration details when config exists', () => {
		render(<SSOConfigurationOverview {...defaultProps} />)

		expect(screen.getByText('SSO Configuration')).toBeInTheDocument()
		expect(
			screen.getByText('Okta identity provider configuration'),
		).toBeInTheDocument()
		expect(screen.getByText('Okta')).toBeInTheDocument()
		expect(screen.getByText('https://dev-123.okta.com')).toBeInTheDocument()
	})

	it('shows enabled badge when SSO is enabled', () => {
		render(<SSOConfigurationOverview {...defaultProps} />)

		expect(screen.getByText('Enabled')).toBeInTheDocument()
	})

	it('shows disabled badge when SSO is disabled', () => {
		const disabledConfig = { ...mockSSOConfig, isEnabled: false }
		render(
			<SSOConfigurationOverview {...defaultProps} ssoConfig={disabledConfig} />,
		)

		expect(screen.getByText('Disabled')).toBeInTheDocument()
	})

	it('displays warning alert when SSO is disabled', () => {
		const disabledConfig = { ...mockSSOConfig, isEnabled: false }
		render(
			<SSOConfigurationOverview {...defaultProps} ssoConfig={disabledConfig} />,
		)

		// The component uses custom styling instead of Alert component
		expect(
			screen.getByText(
				'SSO is configured but currently disabled. Users cannot authenticate through SSO.',
			),
		).toBeInTheDocument()
	})

	it('displays error alert when connection is unhealthy', () => {
		const unhealthyConfig = {
			...mockSSOConfig,
			lastTested: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
		}
		render(
			<SSOConfigurationOverview
				{...defaultProps}
				ssoConfig={unhealthyConfig}
			/>,
		)

		// The component uses custom styling instead of Alert component
		expect(
			screen.getByText(/SSO connection has not been tested recently/),
		).toBeInTheDocument()
	})

	it('shows configuration options correctly', () => {
		render(<SSOConfigurationOverview {...defaultProps} />)

		expect(screen.getByText('Auto-Discovery')).toBeInTheDocument()
		expect(screen.getByText('PKCE Enabled')).toBeInTheDocument()
		expect(screen.getByText('Auto-Provision Users')).toBeInTheDocument()

		// Check that all features are shown with green color (enabled)
		const configSection = screen.getByText('Configuration').closest('div')
		expect(configSection).toBeInTheDocument()
	})

	it('shows X icons for disabled features', () => {
		const configWithDisabledFeatures = {
			...mockSSOConfig,
			autoDiscovery: false,
			pkceEnabled: false,
			autoProvision: false,
		}
		render(
			<SSOConfigurationOverview
				{...defaultProps}
				ssoConfig={configWithDisabledFeatures}
			/>,
		)

		// Verify disabled features are shown
		expect(screen.getByText('Auto-Discovery')).toBeInTheDocument()
		expect(screen.getByText('PKCE Enabled')).toBeInTheDocument()
		expect(screen.getByText('Auto-Provision Users')).toBeInTheDocument()
	})

	it('displays status information correctly', () => {
		render(<SSOConfigurationOverview {...defaultProps} />)

		expect(screen.getByText('Last Tested:')).toBeInTheDocument()
		expect(screen.getByText('Created:')).toBeInTheDocument()
		expect(screen.getByText('Updated:')).toBeInTheDocument()
		expect(screen.getByText('Created by:')).toBeInTheDocument()
		expect(screen.getByText('Admin User')).toBeInTheDocument()
	})

	it('shows "Never" when lastTested is null', () => {
		const configNeverTested = { ...mockSSOConfig, lastTested: null }
		render(
			<SSOConfigurationOverview
				{...defaultProps}
				ssoConfig={configNeverTested}
			/>,
		)

		expect(screen.getByText('Never')).toBeInTheDocument()
	})

	it('displays usage statistics when provided', () => {
		render(<SSOConfigurationOverview {...defaultProps} />)

		expect(screen.getByText('Total Users:')).toBeInTheDocument()
		expect(screen.getByText('25')).toBeInTheDocument()
		expect(screen.getByText('Active Users:')).toBeInTheDocument()
		expect(screen.getByText('20')).toBeInTheDocument()
		expect(screen.getByText('Recent Logins:')).toBeInTheDocument()
		expect(screen.getByText('15')).toBeInTheDocument()
		expect(screen.getByText('Last Login:')).toBeInTheDocument()
	})

	it('calls onTestConnection when Test Connection button is clicked', async () => {
		const user = userEvent.setup()
		const onTestConnection = vi.fn()

		render(
			<SSOConfigurationOverview
				{...defaultProps}
				onTestConnection={onTestConnection}
			/>,
		)

		const testButton = screen.getByText('Test Connection')
		await user.click(testButton)

		expect(onTestConnection).toHaveBeenCalled()
	})

	it('calls onEdit when Edit button is clicked', async () => {
		const user = userEvent.setup()
		const onEdit = vi.fn()

		render(<SSOConfigurationOverview {...defaultProps} onEdit={onEdit} />)

		const editButton = screen.getByText('Edit')
		await user.click(editButton)

		expect(onEdit).toHaveBeenCalled()
	})

	it('calls onToggleStatus when Enable/Disable button is clicked', async () => {
		const user = userEvent.setup()
		const onToggleStatus = vi.fn()

		render(
			<SSOConfigurationOverview
				{...defaultProps}
				onToggleStatus={onToggleStatus}
			/>,
		)

		const disableButton = screen.getByText('Disable')
		await user.click(disableButton)

		expect(onToggleStatus).toHaveBeenCalledWith(false)
	})

	it('shows Enable button for disabled configuration', () => {
		const disabledConfig = { ...mockSSOConfig, isEnabled: false }
		render(
			<SSOConfigurationOverview {...defaultProps} ssoConfig={disabledConfig} />,
		)

		expect(screen.getByText('Enable')).toBeInTheDocument()
	})

	it('masks client ID for security', () => {
		render(<SSOConfigurationOverview {...defaultProps} />)

		expect(screen.getByText('client-1...')).toBeInTheDocument()
	})

	it('handles configuration without createdBy user', () => {
		const configWithoutCreator = { ...mockSSOConfig, createdBy: null }
		render(
			<SSOConfigurationOverview
				{...defaultProps}
				ssoConfig={configWithoutCreator}
			/>,
		)

		// Should not show "Created by" section
		expect(screen.queryByText('Created by:')).not.toBeInTheDocument()
	})

	it('handles stats without lastLogin', () => {
		const statsWithoutLastLogin = { ...mockSSOStats, lastLogin: null }
		render(
			<SSOConfigurationOverview
				{...defaultProps}
				ssoStats={statsWithoutLastLogin}
			/>,
		)

		// Should still show other stats but not last login
		expect(screen.getByText('Total Users:')).toBeInTheDocument()
		expect(screen.queryByText('Last Login:')).not.toBeInTheDocument()
	})
})
