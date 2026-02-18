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

        {/* Header */}
        <View style={styles.header}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#2563eb" />
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

        {/* Stats */}
        <Text style={styles.sectionLabel}>ACTIVITY METRICS</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.reportCount}</Text>
            <Text style={styles.statLabel}>REPORTS LODGED</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.upvoteCount}</Text>
            <Text style={styles.statLabel}>COLLECTIVE VOTES</Text>
          </View>
        </View>

        {/* Controls */}
        <Text style={styles.sectionLabel}>ACCOUNT CONTROL</Text>

        {/* Notifications Toggle */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="notifications-outline" size={20} color="#9ca3af" />
            <Text style={styles.rowLabel}>Notification Preferences</Text>
          </View>
          <Switch
            value={!!user.notifsEnabled}
            onValueChange={toggleNotifs}
            trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
            thumbColor="#ffffff"
          />
        </View>

        {/* Neighborhood */}
        <TouchableOpacity style={styles.row} onPress={() => setShowNeighborhoods(!showNeighborhoods)}>
          <View style={styles.rowLeft}>
            <Ionicons name="home-outline" size={20} color="#9ca3af" />
            <Text style={styles.rowLabel}>Neighborhood Registry</Text>
          </View>
          <Text style={styles.rowValue}>{user.neighborhood || 'Select'}</Text>
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
        <TouchableOpacity style={styles.row} onPress={reportProblem}>
          <View style={styles.rowLeft}>
            <Ionicons name="warning-outline" size={20} color="#9ca3af" />
            <Text style={styles.rowLabel}>Report a Problem</Text>
          </View>
          <Ionicons name="open-outline" size={16} color="#d1d5db" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>TERMINATE SESSION</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  authRequired: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 2 },
  signInBtn: { backgroundColor: '#2563eb', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  signInBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 12, letterSpacing: 2 },

  header: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 24, borderWidth: 2, borderColor: '#dbeafe' },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#dbeafe',
  },
  headerInfo: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 2 },
  email: { fontSize: 13, color: '#9ca3af', fontWeight: '600', marginBottom: 10 },
  tagRow: { flexDirection: 'row', gap: 8 },
  roleTag: { backgroundColor: '#dbeafe', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  roleTagText: { fontSize: 9, fontWeight: '900', color: '#1d4ed8', letterSpacing: 1 },
  neighborhoodTag: { backgroundColor: '#dcfce7', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  neighborhoodTagText: { fontSize: 9, fontWeight: '900', color: '#15803d', letterSpacing: 1 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 3, marginBottom: 12, marginTop: 8 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 20,
    borderWidth: 1, borderColor: '#f3f4f6', padding: 20, alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '900', color: '#2563eb', marginBottom: 4 },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 1.5, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    paddingHorizontal: 18, paddingVertical: 16, marginBottom: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  rowValue: { fontSize: 11, fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1 },

  neighborhoodGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 20, padding: 16, marginBottom: 10,
  },
  neighborhoodChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  neighborhoodChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  neighborhoodChipText: { fontSize: 13, fontWeight: '700', color: '#4b5563' },
  neighborhoodChipTextActive: { color: '#ffffff' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, marginTop: 20,
  },
  logoutText: { fontSize: 13, fontWeight: '900', color: '#dc2626', letterSpacing: 2 },
});
