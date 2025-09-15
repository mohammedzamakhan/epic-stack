import React from 'react'
import { View, StyleSheet, ViewProps } from 'react-native'

export interface CardProps extends ViewProps {
  children: React.ReactNode
  padding?: number
  margin?: number
  elevation?: number
}

const Card: React.FC<CardProps> = ({
  children,
  padding = 16,
  margin = 0,
  elevation = 2,
  style,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        {
          padding,
          margin,
          elevation,
          shadowOpacity: elevation > 0 ? 0.1 : 0,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

const CardHeader: React.FC<ViewProps> = ({ children, ...props }) => {
  return (
    <View style={styles.header} {...props}>
      {children}
    </View>
  )
}

const CardContent: React.FC<ViewProps> = ({ children, ...props }) => {
  return (
    <View style={styles.content} {...props}>
      {children}
    </View>
  )
}

const CardFooter: React.FC<ViewProps> = ({ children, ...props }) => {
  return (
    <View style={styles.footer} {...props}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: 16,
  },
})

export { Card, CardHeader, CardContent, CardFooter }