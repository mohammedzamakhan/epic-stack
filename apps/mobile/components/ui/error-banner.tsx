import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewProps,
} from 'react-native'

export interface ErrorBannerProps extends ViewProps {
  message: string
  type?: 'error' | 'warning' | 'info'
  dismissible?: boolean
  onDismiss?: () => void
  actionText?: string
  onAction?: () => void
  persistent?: boolean
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  type = 'error',
  dismissible = false,
  onDismiss,
  actionText,
  onAction,
  persistent: _persistent = false,
  style,
  ...props
}) => {
  const getBannerStyle = () => {
    switch (type) {
      case 'warning':
        return styles.warningBanner
      case 'info':
        return styles.infoBanner
      case 'error':
      default:
        return styles.errorBanner
    }
  }

  const getTextStyle = () => {
    switch (type) {
      case 'warning':
        return styles.warningText
      case 'info':
        return styles.infoText
      case 'error':
      default:
        return styles.errorText
    }
  }

  const getActionStyle = () => {
    switch (type) {
      case 'warning':
        return styles.warningAction
      case 'info':
        return styles.infoAction
      case 'error':
      default:
        return styles.errorAction
    }
  }

  return (
    <View style={[styles.container, getBannerStyle(), style]} {...props}>
      <View style={styles.content}>
        <Text style={[styles.message, getTextStyle()]}>{message}</Text>
        
        <View style={styles.actions}>
          {actionText && onAction && (
            <TouchableOpacity
              style={[styles.actionButton, getActionStyle()]}
              onPress={onAction}
            >
              <Text style={[styles.actionText, getTextStyle()]}>
                {actionText}
              </Text>
            </TouchableOpacity>
          )}
          
          {dismissible && onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
            >
              <Text style={[styles.dismissText, getTextStyle()]}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dismissText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#EF4444',
  },
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#F59E0B',
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderLeftColor: '#3B82F6',
  },
  errorText: {
    color: '#DC2626',
  },
  warningText: {
    color: '#D97706',
  },
  infoText: {
    color: '#2563EB',
  },
  errorAction: {
    backgroundColor: '#FEE2E2',
  },
  warningAction: {
    backgroundColor: '#FEF3C7',
  },
  infoAction: {
    backgroundColor: '#DBEAFE',
  },
})

export { ErrorBanner }