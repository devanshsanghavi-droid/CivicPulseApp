// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { signInWithGoogle } from '../services/firebaseAuth';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

type Nav = StackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const { setUser } = useApp();
  const navigation = useNavigation<Nav>();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      await setUser(user);
      // Navigation handled automatically by AppNavigator auth state
    } catch (err: any) {
      Alert.alert('Sign-In Failed', err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Ionicons name="shield-checkmark" size={44} color="#ffffff" />
        </View>

        <Text style={styles.appName}>CivicPulse</Text>
        <Text style={styles.subtitle}>AUTHORIZED PERSONNEL ONLY</Text>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resident SSO</Text>
          <Text style={styles.cardSub}>VERIFIED IDENTITY REQUIRED</Text>

          <TouchableOpacity
            style={[styles.googleBtn, isLoading && styles.googleBtnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#4b5563" />
                <Text style={styles.googleBtnText}>Signing in...</Text>
              </>
            ) : (
              <>
                {/* Google G logo colors */}
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Environment Indicator */}
        <View style={styles.environmentIndicator}>
          <Text style={styles.environmentText}>Environment: Development</Text>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Landing')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>RETURN TO HUB</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.cardBackground },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    width: 80, height: 80,
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...SHADOWS.colored(COLORS.primary),
  },
  appName: {
    ...TYPOGRAPHY.pageTitle,
    fontSize: 36,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    ...TYPOGRAPHY.sectionLabel,
    color: COLORS.primary,
    marginBottom: 40,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.xxxl,
    padding: SPACING.xxxl,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    ...SHADOWS.medium,
    marginBottom: SPACING.xxxl,
  },
  cardTitle: {
    ...TYPOGRAPHY.cardTitle,
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    ...TYPOGRAPHY.microLabel,
    color: COLORS.textMuted,
    marginBottom: SPACING.xxxl,
  },
  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: BORDER_RADIUS.round,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleIcon: {
    width: 22, height: 22,
    backgroundColor: '#4285F4',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  googleBtnText: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  backBtn: { marginTop: SPACING.sm },
  backBtnText: {
    ...TYPOGRAPHY.microLabel,
    color: '#d1d5db',
  },
  environmentIndicator: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  environmentText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  versionText: {
    ...TYPOGRAPHY.microLabel,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
});
