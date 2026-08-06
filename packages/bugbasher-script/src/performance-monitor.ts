// Performance monitoring for BugBasher script loading
import { Logger } from './logger.js'

interface PerformanceMetrics {
	scriptLoadTime: number
	initializationTime: number
	toolbarLoadTime?: number
	openReplayLoadTime?: number
	commentSystemLoadTime?: number
	communicationLoadTime?: number
}

class PerformanceMonitor {
	private metrics: Partial<PerformanceMetrics> = {}
	private startTimes: Map<string, number> = new Map()
	private logger: Logger

	constructor(debug: boolean = false) {
		this.logger = new Logger(debug, 'BugBasher Performance')
		this.markStart('scriptLoad')
	}

	markStart(operation: string): void {
		this.startTimes.set(operation, performance.now())
	}

	markEnd(operation: string): number {
		const startTime = this.startTimes.get(operation)
		if (!startTime) {
			this.logger.warn(`No start time found for ${operation}`)
			return 0
		}

		const duration = performance.now() - startTime
		this.startTimes.delete(operation)

		// Store in metrics
		switch (operation) {
			case 'scriptLoad':
				this.metrics.scriptLoadTime = duration
				break
			case 'initialization':
				this.metrics.initializationTime = duration
				break
			case 'toolbarLoad':
				this.metrics.toolbarLoadTime = duration
				break
			case 'openReplayLoad':
				this.metrics.openReplayLoadTime = duration
				break
			case 'commentSystemLoad':
				this.metrics.commentSystemLoadTime = duration
				break
			case 'communicationLoad':
				this.metrics.communicationLoadTime = duration
				break
		}

		if (this.logger.isDebugEnabled()) {
			this.logger.log(`${operation} took ${duration.toFixed(2)}ms`)
		}

		return duration
	}

	getMetrics(): PerformanceMetrics {
		return { ...this.metrics } as PerformanceMetrics
	}

	logSummary(): void {
		if (!this.logger.isDebugEnabled()) return

		this.logger.group('Performance Summary')
		this.logger.log(
			'Script Load Time:',
			this.metrics.scriptLoadTime?.toFixed(2) + 'ms',
		)
		this.logger.log(
			'Initialization Time:',
			this.metrics.initializationTime?.toFixed(2) + 'ms',
		)

		if (this.metrics.toolbarLoadTime) {
			this.logger.log(
				'Toolbar Load Time:',
				this.metrics.toolbarLoadTime.toFixed(2) + 'ms',
			)
		}

		if (this.metrics.openReplayLoadTime) {
			this.logger.log(
				'OpenReplay Load Time:',
				this.metrics.openReplayLoadTime.toFixed(2) + 'ms',
			)
		}

		if (this.metrics.commentSystemLoadTime) {
			this.logger.log(
				'Comment System Load Time:',
				this.metrics.commentSystemLoadTime.toFixed(2) + 'ms',
			)
		}

		if (this.metrics.communicationLoadTime) {
			this.logger.log(
				'Communication Load Time:',
				this.metrics.communicationLoadTime.toFixed(2) + 'ms',
			)
		}

		const totalTime = Object.values(this.metrics).reduce(
			(sum, time) => sum + (time || 0),
			0,
		)
		this.logger.log('Total Load Time:', totalTime.toFixed(2) + 'ms')
		this.logger.groupEnd()
	}

	// Track memory usage if available
	getMemoryUsage(): any {
		if ('memory' in performance) {
			return {
				usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
				totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
				jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
			}
		}
		return null
	}
}

// Global performance monitor instance
let performanceMonitor: PerformanceMonitor | null = null

export function initPerformanceMonitor(
	debug: boolean = false,
): PerformanceMonitor {
	if (!performanceMonitor) {
		performanceMonitor = new PerformanceMonitor(debug)
	}
	return performanceMonitor
}

export function getPerformanceMonitor(): PerformanceMonitor | null {
	return performanceMonitor
}

// Convenience functions
export function markStart(operation: string): void {
	performanceMonitor?.markStart(operation)
}

export function markEnd(operation: string): number {
	return performanceMonitor?.markEnd(operation) || 0
}

export function logPerformanceSummary(): void {
	performanceMonitor?.logSummary()
}
