// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, SafeAreaView, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { signInWithGoogle } from '../services/firebaseAuth';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SplineBackground } from '../components/SplineBackground';
import { TYPOGRAPHY, BORDER_RADIUS } from '../styles/designSystem';

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
    } catch (err: any) {
      Alert.alert('Sign-In Failed', err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Spline 3D background — bottom half */}
      <View style={styles.splineContainer}>
        <SplineBackground />
      </View>

      {/* Gradient overlay so form stays readable */}
      <LinearGradient
        colors={['#000000', '#000000cc', '#00000000']}
        style={styles.gradient}
      />

      {/* Content */}
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.appName}>
              Civic<Text style={styles.appPulse}>Pulse</Text>
            </Text>
            <Text style={styles.citySub}>
              Los Altos Community Platform
            </Text>
          </View>

          {/* Login card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Welcome back
            </Text>
            <Text style={styles.cardSub}>
              Sign in to report and track issues in your community
            </Text>

            {/* Google Sign In button */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              style={[styles.googleBtn, isLoading && styles.googleBtnDisabled]}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Landing')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>RETURN TO HUB</Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  splineContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    zIndex: 1,
  },
  safe: {
    flex: 1,
    zIndex: 2,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 32,
  },
  logoContainer: {
    marginBottom: 40,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  appPulse: {
    color: '#3b82f6',
  },
  citySub: {
    color: '#94a3b8',
    marginTop: 4,
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 32,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 32,
  },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleBtnDisabled: {
    opacity: 0.7,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
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
    color: '#111827',
    fontWeight: '700',
    fontSize: 16,
  },
  backBtn: {
    marginTop: 24,
    alignSelf: 'center',
  },
  backBtnText: {
    ...TYPOGRAPHY.microLabel,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
});
