import React from 'react'
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewProps,
} from 'react-native'

interface LoadingSpinnerProps extends Omit<ViewProps, 'style'> {
  size?: 'small' | 'large'
  color?: string
  text?: string
  overlay?: boolean
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#3B82F6',
  text,
  overlay = false,
  ...props
}) => {
  const containerStyle = [
    styles.container,
    overlay && styles.overlay,
  ]

  return (
    <View style={containerStyle} {...props}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
})

export { LoadingSpinner }
export type { LoadingSpinnerProps }