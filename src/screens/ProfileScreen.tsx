// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Switch, Alert, SafeAreaView, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { signOutUser } from '../services/firebaseAuth';
import { storageService } from '../services/storage';
import { firestoreService } from '../services/firestoreService';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

type Nav = StackNavigationProp<RootStackParamList>;

const NEIGHBORHOODS = ['Downtown', 'Highlands', 'Westside', 'Lakeshore', 'Old Town', 'Creekview'];

export default function ProfileScreen() {
  const { user, setUser } = useApp();
  const navigation = useNavigation<Nav>();
  const [stats, setStats] = useState({ reportCount: 0, upvoteCount: 0 });
  const [showNeighborhoods, setShowNeighborhoods] = useState(false);

  useEffect(() => {
    if (user) {
      firestoreService.getUserStats(user.id).then(setStats).catch(console.error);
    }
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Ionicons name="person-circle-outline" size={72} color="#e5e7eb" />
          <Text style={styles.authRequired}>AUTHENTICATION REQUIRED</Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.signInBtnText}>SIGN IN</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = async () => {
    Alert.alert('Terminate Session', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          try {
            await signOutUser();
            await setUser(null);
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        }
      }
    ]);
  };

  const toggleNotifs = async () => {
    const updated = await storageService.updateProfile(user.id, { notifsEnabled: !user.notifsEnabled });
    if (updated) await setUser(updated);
  };

  const selectNeighborhood = async (n: string) => {
    const updated = await storageService.updateProfile(user.id, { neighborhood: n });
    if (updated) await setUser(updated);
    setShowNeighborhoods(false);
  };

  const reportProblem = () => {
    Linking.openURL('mailto:civicpulsehelpdesk@gmail.com?subject=CivicPulse Support Request&body=Hi CivicPulse Team,%0D%0A%0D%0AI\'d like to report an issue:');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header with Large Avatar */}
        <View style={styles.header}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={COLORS.primary} />
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.tagRow}>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{user.role.toUpperCase()}</Text>
              </View>
              {user.neighborhood && (
                <View style={styles.neighborhoodTag}>
                  <Text style={styles.neighborhoodTagText}>{user.neighborhood.toUpperCase()}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionLabel}>ACTIVITY METRICS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.reportCount}</Text>
            <Text style={styles.statLabel}>REPORTS LOGGED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{stats.upvoteCount}</Text>
            <Text style={styles.statLabel}>COLLECTIVE VOTES</Text>
          </View>
        </View>

        {/* Settings with Chevrons */}
        <Text style={styles.sectionLabel}>ACCOUNT CONTROL</Text>

        {/* Notifications Toggle */}
        <TouchableOpacity style={styles.settingRow} onPress={() => {}}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.settingLabel}>Notification Preferences</Text>
          </View>
          <View style={styles.settingRight}>
            <Switch
              value={!!user.notifsEnabled}
              onValueChange={toggleNotifs}
              trackColor={{ false: '#e5e7eb', true: COLORS.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </TouchableOpacity>

        {/* Neighborhood */}
        <TouchableOpacity style={styles.settingRow} onPress={() => setShowNeighborhoods(!showNeighborhoods)}>
          <View style={styles.settingLeft}>
            <Ionicons name="home-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.settingLabel}>Neighborhood Registry</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>{user.neighborhood || 'Select'}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {showNeighborhoods && (
          <View style={styles.neighborhoodGrid}>
            {NEIGHBORHOODS.map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.neighborhoodChip, user.neighborhood === n && styles.neighborhoodChipActive]}
                onPress={() => selectNeighborhood(n)}
              >
                <Text style={[styles.neighborhoodChipText, user.neighborhood === n && styles.neighborhoodChipTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Report a Problem */}
        <TouchableOpacity style={styles.settingRow} onPress={reportProblem}>
          <View style={styles.settingLeft}>
            <Ionicons name="warning-outline" size={20} color={COLORS.textMuted} />
            <Text style={styles.settingLabel}>Report a Problem</Text>
          </View>
          <View style={styles.settingRight}>
            <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
          </View>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>TERMINATE SESSION</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg },
  authRequired: { ...TYPOGRAPHY.sectionLabel, color: COLORS.textMuted },
  signInBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.xxxl, paddingVertical: SPACING.md },
  signInBtnText: { ...TYPOGRAPHY.caption, color: '#ffffff', fontWeight: '900', letterSpacing: 2 },

  header: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.xxxl, alignItems: 'center' },
  avatar: { width: 96, height: 96, borderRadius: BORDER_RADIUS.xxl, borderWidth: 2, borderColor: COLORS.primaryBorder },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primaryBorder,
  },
  headerInfo: { flex: 1, justifyContent: 'center' },
  name: { ...TYPOGRAPHY.pageTitle, fontSize: 22, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  email: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '600', marginBottom: SPACING.sm },
  tagRow: { flexDirection: 'row', gap: SPACING.sm },
  roleTag: { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.round, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  roleTagText: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, letterSpacing: 1 },
  neighborhoodTag: { backgroundColor: '#dcfce7', borderRadius: BORDER_RADIUS.round, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  neighborhoodTagText: { ...TYPOGRAPHY.microLabel, color: COLORS.success, letterSpacing: 1 },

  sectionLabel: { ...TYPOGRAPHY.sectionLabel, color: COLORS.textMuted, marginBottom: SPACING.md, marginTop: SPACING.lg },

  // Stats Grid (2-column layout)
  statsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1, 
    backgroundColor: COLORS.cardBackground, 
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, 
    borderColor: COLORS.border,
    padding: SPACING.lg, 
    alignItems: 'center',
    ...SHADOWS.subtle,
  },
  statValue: { ...TYPOGRAPHY.pageTitle, fontSize: 28, color: COLORS.primary, marginBottom: SPACING.xs },
  statLabel: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, textAlign: 'center' },

  // Settings Rows with Chevrons
  settingRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground, 
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, 
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md, 
    marginBottom: SPACING.sm,
  },
  settingLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.sm,
  },
  settingLabel: { 
    ...TYPOGRAPHY.body, 
    fontWeight: '700', 
    color: COLORS.textSecondary,
  },
  settingRight: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.xs,
  },
  settingValue: { 
    ...TYPOGRAPHY.caption, 
    fontWeight: '800', 
    color: COLORS.primary, 
    textTransform: 'uppercase', 
    letterSpacing: 1,
  },

  neighborhoodGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.lg, 
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  neighborhoodChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.cardBackground,
    borderWidth: 1, borderColor: COLORS.border,
  },
  neighborhoodChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  neighborhoodChipText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },
  neighborhoodChipTextActive: { color: '#ffffff' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.lg, 
    paddingVertical: SPACING.md, marginTop: SPACING.xl,
  },
  logoutText: { ...TYPOGRAPHY.caption, fontWeight: '900', color: COLORS.error, letterSpacing: 2 },
});
