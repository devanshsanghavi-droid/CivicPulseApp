// src/components/ThemeToggle.tsx
import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ThemeToggleProps {
    isDark: boolean;
    onToggle: (isDark: boolean) => void;
}

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
    const translateX = useRef(new Animated.Value(isDark ? 0 : 32)).current;

    useEffect(() => {
        Animated.spring(translateX, {
            toValue: isDark ? 0 : 32,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
        }).start();
    }, [isDark]);

    return (
        <TouchableOpacity
            onPress={() => onToggle(!isDark)}
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e5e7eb',
                },
            ]}
            activeOpacity={0.8}
        >
            <Animated.View
                style={[
                    styles.thumb,
                    { backgroundColor: isDark ? '#334155' : '#f3f4f6' },
                    { transform: [{ translateX }] },
                ]}
            >
                <Ionicons
                    name={isDark ? 'moon' : 'sunny'}
                    size={14}
                    color={isDark ? '#ffffff' : '#374151'}
                />
            </Animated.View>
            <View style={styles.iconRight}>
                <Ionicons
                    name={isDark ? 'sunny' : 'moon'}
                    size={14}
                    color={isDark ? '#6b7280' : '#111827'}
                />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 64,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        padding: 4,
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    thumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        left: 4,
        zIndex: 2,
    },
    iconRight: {
        position: 'absolute',
        right: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
