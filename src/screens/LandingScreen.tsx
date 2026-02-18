// src/screens/LandingScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;

const FeatureCard = ({ icon, title, description }: { icon: any; title: string; description: string }) => (
  <View style={styles.featureCard}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon} size={28} color="#2563eb" />
    </View>
    <Text style={styles.featureTitle}>{title}</Text>
    <Text style={styles.featureDesc}>{description}</Text>
  </View>
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function LandingScreen() {
  const { user } = useApp();
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={14} color="#2563eb" />
            <Text style={styles.badgeText}>Community-Powered City Improvement</Text>
          </View>

          <Text style={styles.heroTitle}>CivicPulse</Text>
          <Text style={styles.heroSub}>
            Report issues in your city. Upvote what matters.{'\n'}Make your community better, together.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Main')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Browse Issues</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>

          {!user && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="person-outline" size={18} color="#4b5563" />
              <Text style={styles.secondaryBtnText}>Sign In / Join</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureCard
            icon="location"
            title="Report Issues"
            description="Snap a photo, pin the location, and submit. It takes less than a minute to inform the city."
          />
          <FeatureCard
            icon="trending-up"
            title="Prioritize Together"
            description="Upvote issues that affect you. The most critical concerns naturally rise to the top."
          />
          <FeatureCard
            icon="notifications"
            title="Track Progress"
            description="Follow reported issues and receive updates when the city acknowledges or resolves them."
          />
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <StatItem value="150+" label="ISSUES REPORTED" />
          <View style={styles.statDivider} />
          <StatItem value="2.5K" label="COMMUNITY VOTES" />
          <View style={styles.statDivider} />
          <StatItem value="89%" label="RESOLUTION RATE" />
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>Ready to make a difference?</Text>
          <Text style={styles.ctaDesc}>
            Join your neighbors in prioritizing urban infrastructure and building a safer community.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate(user ? 'Main' : 'Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {user ? 'Report Your First Issue' : 'Sign Up to Report Issues'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40 },

  // Hero
  hero: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 24,
  },
  badgeText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  heroTitle: {
    fontSize: 56, fontWeight: '900', color: '#2563eb',
    letterSpacing: -2, marginBottom: 16, textAlign: 'center',
  },
  heroSub: {
    fontSize: 16, color: '#6b7280', textAlign: 'center',
    lineHeight: 24, marginBottom: 32,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 16,
    shadowColor: '#2563eb', shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    marginBottom: 12,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  secondaryBtnText: { color: '#4b5563', fontSize: 15, fontWeight: '700' },

  // Features
  features: { paddingHorizontal: 16, gap: 12, marginBottom: 32 },
  featureCard: {
    backgroundColor: '#ffffff', borderRadius: 24,
    borderWidth: 1, borderColor: '#f3f4f6',
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  featureIcon: {
    width: 56, height: 56, backgroundColor: '#eff6ff',
    borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  featureTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  featureDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  // Stats
  statsSection: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    marginHorizontal: 16, borderRadius: 20, padding: 24,
    justifyContent: 'space-around', alignItems: 'center', marginBottom: 40,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 28, fontWeight: '900', color: '#2563eb', marginBottom: 4 },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.5, textAlign: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#e2e8f0' },

  // CTA
  cta: { paddingHorizontal: 24, alignItems: 'center' },
  ctaTitle: { fontSize: 28, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 12 },
  ctaDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
});
