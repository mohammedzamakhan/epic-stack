import { KeyboardTypeOptions, ReturnKeyTypeOptions, Keyboard } from 'react-native'

export type InputType = 'email' | 'password' | 'username' | 'text' | 'number' | 'phone'

export interface KeyboardConfig {
  keyboardType: KeyboardTypeOptions
  returnKeyType: ReturnKeyTypeOptions
  autoCapitalize: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect: boolean
  secureTextEntry?: boolean
  textContentType?: string
  autoComplete?: string
}

/**
 * Dismisses the keyboard
 */
export function dismissKeyboard(): void {
  Keyboard.dismiss()
}

export function getKeyboardConfig(inputType: InputType = 'text'): KeyboardConfig {
  switch (inputType) {
    case 'email':
      return {
        keyboardType: 'email-address',
        returnKeyType: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
        textContentType: 'emailAddress',
        autoComplete: 'email',
      }
    case 'password':
      return {
        keyboardType: 'default',
        returnKeyType: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
        secureTextEntry: true,
        textContentType: 'password',
        autoComplete: 'password',
      }
    case 'username':
      return {
        keyboardType: 'default',
        returnKeyType: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
        textContentType: 'username',
        autoComplete: 'username',
      }
    case 'number':
      return {
        keyboardType: 'numeric',
        returnKeyType: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
      }
    case 'phone':
      return {
        keyboardType: 'phone-pad',
        returnKeyType: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
        textContentType: 'telephoneNumber',
        autoComplete: 'tel',
      }
    case 'text':
    default:
      return {
        keyboardType: 'default',
        returnKeyType: 'done',
        autoCapitalize: 'sentences',
        autoCorrect: true,
      }
  }
}