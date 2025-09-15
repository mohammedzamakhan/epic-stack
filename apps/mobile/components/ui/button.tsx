import React from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native'
import { triggerButtonHaptic } from '../../lib/haptics'

export interface ButtonProps extends TouchableOpacityProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  loading?: boolean
  disabled?: boolean
  hapticFeedback?: boolean
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  hapticFeedback = true,
  onPress,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading

  const handlePress = async (event: any) => {
    if (isDisabled) return

    if (hapticFeedback) {
      await triggerButtonHaptic()
    }
    onPress?.(event)
  }

  const getVariantStyle = (variant: string) => {
    switch (variant) {
      case 'primary': return styles.buttonPrimary
      case 'secondary': return styles.buttonSecondary
      case 'outline': return styles.buttonOutline
      case 'ghost': return styles.buttonGhost
      default: return styles.buttonPrimary
    }
  }

  const getSizeStyle = (size: string) => {
    switch (size) {
      case 'sm': return styles.buttonSm
      case 'default': return styles.buttonDefault
      case 'lg': return styles.buttonLg
      default: return styles.buttonDefault
    }
  }

  const getTextVariantStyle = (variant: string) => {
    switch (variant) {
      case 'primary': return styles.textPrimary
      case 'secondary': return styles.textSecondary
      case 'outline': return styles.textOutline
      case 'ghost': return styles.textGhost
      default: return styles.textPrimary
    }
  }

  const getTextSizeStyle = (size: string) => {
    switch (size) {
      case 'sm': return styles.textSm
      case 'default': return styles.textDefault
      case 'lg': return styles.textLg
      default: return styles.textDefault
    }
  }

  const buttonStyle = [
    styles.button,
    getVariantStyle(variant),
    getSizeStyle(size),
    isDisabled && styles.buttonDisabled,
    style,
  ]

  const textStyle = [
    styles.text,
    getTextVariantStyle(variant),
    getTextSizeStyle(size),
    isDisabled && styles.textDisabled,
  ]

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#FFFFFF' : '#3B82F6'}
        />
      ) : (
        typeof children === 'string' ? (
          <Text style={textStyle}>{children}</Text>
        ) : (
          children
        )
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  buttonSm: {
    height: 36,
    paddingHorizontal: 12,
  },
  buttonDefault: {
    height: 44,
    paddingHorizontal: 16,
  },
  buttonLg: {
    height: 52,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '500',
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#374151',
  },
  textOutline: {
    color: '#3B82F6',
  },
  textGhost: {
    color: '#3B82F6',
  },
  textSm: {
    fontSize: 14,
  },
  textDefault: {
    fontSize: 16,
  },
  textLg: {
    fontSize: 18,
  },
  textDisabled: {
    opacity: 0.7,
  },
})

export { Button }