import { Keyboard } from 'react-native'
import type { KeyboardConfig, InputType } from './types'

/**
 * Get optimized keyboard configuration for different input types
 */
export const getKeyboardConfig = (inputType: InputType): KeyboardConfig => {
  switch (inputType) {
    case 'email':
      return {
        keyboardType: 'email-address',
        autoCapitalize: 'none',
        autoCorrect: false,
        returnKeyType: 'next',
        textContentType: 'emailAddress',
        autoComplete: 'email',
      }
    
    case 'password':
      return {
        keyboardType: 'default',
        autoCapitalize: 'none',
        autoCorrect: false,
        returnKeyType: 'done',
        textContentType: 'password',
        autoComplete: 'current-password',
      }
    
    case 'username':
      return {
        keyboardType: 'default',
        autoCapitalize: 'none',
        autoCorrect: false,
        returnKeyType: 'next',
        textContentType: 'username',
        autoComplete: 'username',
      }
    
    case 'search':
      return {
        keyboardType: 'default',
        autoCapitalize: 'none',
        autoCorrect: true,
        returnKeyType: 'search',
        textContentType: 'none',
      }
    
    case 'text':
    default:
      return {
        keyboardType: 'default',
        autoCapitalize: 'sentences',
        autoCorrect: true,
        returnKeyType: 'done',
        textContentType: 'none',
      }
  }
}

/**
 * Dismiss the keyboard
 */
export const dismissKeyboard = (): void => {
  Keyboard.dismiss()
}

/**
 * Check if keyboard is currently visible
 */
export const isKeyboardVisible = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      subscription.remove()
      resolve(true)
    })
    
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      hideSubscription.remove()
      resolve(false)
    })
    
    // Timeout to resolve false if no keyboard events
    setTimeout(() => {
      subscription.remove()
      hideSubscription.remove()
      resolve(false)
    }, 100)
  })
}

/**
 * Add keyboard event listeners
 */
export const addKeyboardListeners = (
  onShow?: (height: number) => void,
  onHide?: () => void
) => {
  const showSubscription = onShow 
    ? Keyboard.addListener('keyboardDidShow', (e) => onShow(e.endCoordinates.height))
    : null
    
  const hideSubscription = onHide 
    ? Keyboard.addListener('keyboardDidHide', onHide)
    : null

  return () => {
    showSubscription?.remove()
    hideSubscription?.remove()
  }
}