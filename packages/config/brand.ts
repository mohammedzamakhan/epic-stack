/**
 * Centralized brand configuration for all apps
 * Change these values once to update across the entire monorepo
 */

export const brand = {
	// Core brand identity
	name: 'BugBasher',
	shortName: 'bugbasher',
	tagline: 'Fix bugs in hours, not days. One tap. Full Capture. Ship.',
	description:
		'Bug reports with all the context, captured with tap of a button, including Console logs, Network requests, Performance metrics, Device information. All the details that your developer needs to fix the bugs without back and forth communication.',

	// URLs
	url: 'https://bugbasher.dev',
	supportEmail: 'zama@bugbasher.dev',

	// Social/Meta
	twitterHandle: '@bugbasher',

	// Legal
	companyName: 'BugBasher',
	copyrightYear: new Date().getFullYear(),

	// Product-specific descriptions
	products: {
		app: {
			name: 'BugBasher',
			description: "Your own captain's log",
			tagline: 'Comprehensive note-taking and organization management platform',
		},
		admin: {
			name: 'BugBasher Admin',
			description: 'Admin dashboard for BugBasher',
		},
		web: {
			name: 'BugBasher',
			description:
				'Modern SaaS boilerplate that helps developers and founders launch production-ready applications in minutes.',
		},
		extension: {
			name: 'BugBasher Extension',
			chrome: 'BugBasher Chrome Extension',
			firefox: 'BugBasher Firefox Extension',
			description: 'Chrome extension for BugBasher',
		},
		cms: {
			name: 'BugBasher CMS',
			description: 'Content management system for BugBasher',
		},
	},

	// Email subjects
	email: {
		passwordReset: 'BugBasher Password Reset',
		welcome: 'Welcome to BugBasher!',
		emailChange: 'BugBasher Email Change Verification',
	},

	// AI Assistant configuration
	ai: {
		systemPrompt:
			'You are an intelligent AI assistant for BugBasher, a comprehensive note-taking and organization management platform. You specialize in helping users maximize their productivity and collaboration through smart note management.',
	},
} as const

// Helper to generate page titles
export const getPageTitle = (page?: string) => {
	if (!page) return brand.name
	return `${page} | ${brand.name}`
}

// Helper for error titles
export const getErrorTitle = () => `Error | ${brand.name}`

// Helper for copyright text
export const getCopyright = () =>
	`© ${brand.copyrightYear} ${brand.companyName}. All rights reserved.`
