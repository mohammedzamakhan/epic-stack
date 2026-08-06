/**
 * Simple logging utility that respects debug configuration
 */
export class Logger {
	private debug: boolean
	private prefix: string

	constructor(debug: boolean = false, prefix: string = 'BugBasher') {
		this.debug = debug
		this.prefix = prefix
	}

	log(...args: any[]): void {
		if (this.debug) {
			console.log(`${this.prefix}:`, ...args)
		}
	}

	warn(...args: any[]): void {
		if (this.debug) {
			console.warn(`${this.prefix}:`, ...args)
		}
	}

	error(...args: any[]): void {
		// Always log errors, regardless of debug setting
		console.error(`${this.prefix}:`, ...args)
	}

	group(label: string): void {
		if (this.debug) {
			console.group(`${this.prefix}: ${label}`)
		}
	}

	groupEnd(): void {
		if (this.debug) {
			console.groupEnd()
		}
	}

	setDebug(debug: boolean): void {
		this.debug = debug
	}

	isDebugEnabled(): boolean {
		return this.debug
	}
}

// Create a default logger instance
export const logger = new Logger()
