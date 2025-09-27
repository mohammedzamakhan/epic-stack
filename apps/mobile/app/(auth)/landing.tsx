import React, { useState, useRef } from 'react'
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

interface OnboardingSlide {
    id: number
    title: string
    subtitle: string
    emoji: string
    backgroundColor: string
}

const slides: OnboardingSlide[] = [
    {
        id: 1,
        title: 'The easiest way to...',
        subtitle: 'Track what you eat 🍎',
        emoji: '🍎',
        backgroundColor: '#f0f9ff',
    },
    {
        id: 2,
        title: 'The easiest way to...',
        subtitle: 'Build amazing apps ⚡',
        emoji: '⚡',
        backgroundColor: '#fef3c7',
    },
    {
        id: 3,
        title: 'The easiest way to...',
        subtitle: 'Ship faster 🚀',
        emoji: '🚀',
        backgroundColor: '#f0fdf4',
    },
]

export default function LandingScreen() {
    const router = useRouter()
    const [currentIndex, setCurrentIndex] = useState(0)
    const scrollViewRef = useRef<ScrollView>(null)
    const insets = useSafeAreaInsets()

    const handleGetStarted = () => {
        router.push('/(auth)/sign-up')
    }

    const handleSignIn = () => {
        router.push('/(auth)/sign-in')
    }

    const handleScroll = (event: any) => {
        const slideSize = width
        const index = Math.round(event.nativeEvent.contentOffset.x / slideSize)
        setCurrentIndex(index)
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
                <View style={styles.logoContainer}>
                    <View style={styles.logo} />
                </View>
                <TouchableOpacity onPress={handleSignIn} style={styles.signInButton}>
                    <Text style={styles.signInText}>Sign in</Text>
                </TouchableOpacity>
            </View>

            {/* Carousel */}
            <View style={styles.carouselContainer}>
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    style={styles.carousel}
                >
                    {slides.map((slide) => (
                        <View key={slide.id} style={[styles.slide, { backgroundColor: slide.backgroundColor }]}>
                            <View style={styles.slideContent}>
                                <Text style={styles.slideEmoji}>{slide.emoji}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 30 }]}>
                <Text style={styles.title}>{slides[currentIndex].title}</Text>
                <Text style={styles.subtitle}>{slides[currentIndex].subtitle}</Text>

                {/* Page Indicators */}
                <View style={styles.indicators}>
                    {slides.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.indicator,
                                index === currentIndex ? styles.activeIndicator : styles.inactiveIndicator,
                            ]}
                        />
                    ))}
                </View>

                {/* Get Started Button */}
                <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
                    <Text style={styles.getStartedText}>Get Started</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 8,
        backgroundColor: '#ffffff',
        zIndex: 10,
    },
    signInButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        flex: 1,
        alignItems: 'center',
    },
    logo: {
        width: 24,
        height: 24,
        backgroundColor: '#4ade80',
        borderRadius: 12,
    },
    signInText: {
        fontSize: 16,
        color: '#6b7280',
        fontWeight: '500',
    },
    carouselContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    carousel: {
        flex: 1,
    },
    slide: {
        width: width,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    slideContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: width * 0.7,
        height: width * 0.7,
        backgroundColor: '#ffffff',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    slideEmoji: {
        fontSize: 80,
    },
    content: {
        paddingHorizontal: 32,
        alignItems: 'center',
        paddingTop: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    activeIndicator: {
        backgroundColor: '#1f2937',
    },
    inactiveIndicator: {
        backgroundColor: '#d1d5db',
    },
    getStartedButton: {
        backgroundColor: '#4ade80',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
    },
    getStartedText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
})