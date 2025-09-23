export type HapticFeedbackType =
	| 'light'
	| 'medium'
	| 'heavy'
	| 'success'
	| 'warning'
	| 'error'
	| 'selection'

export interface HapticConfig {
	enabled: boolean
	intensity?: 'light' | 'medium' | 'heavy'
}
