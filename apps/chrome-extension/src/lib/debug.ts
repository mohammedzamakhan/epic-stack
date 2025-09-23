// Debug utilities for Chrome extension development

export const DEBUG = process.env.NODE_ENV === 'development'

export const logger = {
	info: (message: string, ...args: any[]) => {
		if (DEBUG) {
			console.log(`[Extension] ${message}`, ...args)
		}
	},
	warn: (message: string, ...args: any[]) => {
		if (DEBUG) {
			console.warn(`[Extension] ${message}`, ...args)
		}
	},
	error: (message: string, ...args: any[]) => {
		console.error(`[Extension] ${message}`, ...args)
	},
}

// Performance monitoring
export const perf = {
	start: (label: string) => {
		if (DEBUG) {
			console.time(`[Extension] ${label}`)
		}
	},
	end: (label: string) => {
		if (DEBUG) {
			console.timeEnd(`[Extension] ${label}`)
		}
	},
}

// Message debugging
export const debugMessage = (
	direction: 'sent' | 'received',
	message: any,
	context?: string,
) => {
	if (DEBUG) {
		const prefix = direction === 'sent' ? '→' : '←'
		logger.info(`${prefix} Message ${context ? `(${context})` : ''}:`, message)
	}
}
