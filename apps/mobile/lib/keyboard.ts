import { KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native'

export type InputType = 'email' | 'password' | 'username' | 'text' | 'number' | 'phone'

export interface KeyboardConfig {
  keyboardType: KeyboardTypeOptions
  returnKeyType: ReturnKeyTypeOptions
  autoCapitalize: 'none' | 'sentences' | 'words' | 'characters'
  autoCorrect: boolean
  secureTextEntry?: boolean
}

export function getKeyboardConfig(inputType: InputType = 'text'): KeyboardConfig {
  switch (inputType) {
    case 'email':
      return {
        keyboardType: 'email-address',
        returnKeyType: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
      }
    case 'password':
      return {
        keyboardType: 'default',
        returnKeyType: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
        secureTextEntry: true,
      }
    case 'username':
      return {
        keyboardType: 'default',
        returnKeyType: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
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