/** @type {import('@lhci/cli').LighthouseConfig} */
module.exports = {
	ci: {
		collect: {
			numberOfRuns: 3,
			settings: {
				preset: 'desktop',
				throttling: {
					cpuSlowdownMultiplier: 1,
				},
				screenEmulation: {
					mobile: false,
					width: 1350,
					height: 940,
					deviceScaleFactor: 1,
					disabled: false,
				},
				formFactor: 'desktop',
			},
		},
		assert: {
			assertions: {
				'categories:performance': ['error', { minScore: 0.98 }],
				'categories:accessibility': ['error', { minScore: 0.98 }],
				'categories:best-practices': ['error', { minScore: 0.98 }],
				'categories:seo': ['error', { minScore: 0.98 }],

				'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
				'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
				'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
				'total-blocking-time': ['warn', { maxNumericValue: 200 }],
				'speed-index': ['warn', { maxNumericValue: 3000 }],

				'uses-responsive-images': 'warn',
				'uses-optimized-images': 'warn',
				'uses-text-compression': 'warn',
				'uses-rel-preconnect': 'warn',
				'render-blocking-resources': 'warn',
				'unused-css-rules': 'warn',
				'unused-javascript': 'warn',
				'modern-image-formats': 'warn',
				'offscreen-images': 'warn',
				'efficient-animated-content': 'warn',
			},
		},
		upload: {
			target: 'temporary-public-storage',
		},
	},
}
