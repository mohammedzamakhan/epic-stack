import { KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native'

export interface KeyboardConfig {
	keyboardType: KeyboardTypeOptions
	autoCapitalize: 'none' | 'sentences' | 'words' | 'characters'
	autoCorrect: boolean
	returnKeyType: ReturnKeyTypeOptions
	textContentType?: string
	autoComplete?: string
}

export type InputType = 'email' | 'password' | 'username' | 'text' | 'search'

export interface FocusManager {
	focusNext: () => void
	focusPrevious: () => void
	dismissKeyboard: () => void
	getCurrentFocus: () => number | null
}
