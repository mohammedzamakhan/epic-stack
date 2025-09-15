import React from 'react'
import {
  View,
  StyleSheet,
  ViewProps,
  StatusBar,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface ScreenProps extends ViewProps {
  children: React.ReactNode
  safeArea?: boolean
  statusBarStyle?: 'default' | 'light-content' | 'dark-content'
  backgroundColor?: string
}

const Screen: React.FC<ScreenProps> = ({
  children,
  safeArea = true,
  statusBarStyle = 'dark-content',
  backgroundColor = '#FFFFFF',
  style,
  ...props
}) => {
  const Container = safeArea ? SafeAreaView : View

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={Platform.OS === 'android' ? backgroundColor : undefined}
      />
      <Container
        style={[
          styles.container,
          { backgroundColor },
          style,
        ]}
        {...props}
      >
        {children}
      </Container>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})

export { Screen }
export type { ScreenProps }