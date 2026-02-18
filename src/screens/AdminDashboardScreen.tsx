// src/screens/AdminDashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { useApp } from '../context/AppContext';
import { Issue, UserRecord } from '../types';

type AdminTab = 'issues' | 'users';

const STATUS_OPTIONS = ['open', 'acknowledged', 'resolved'] as const;

export default function AdminDashboardScreen() {
  const { user, isAdmin } = useApp();
  const [tab, setTab] = useState<AdminTab>('issues');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'issues') {
        const data = await firestoreService.getIssues('newest');
        setIssues(data);
      } else {
        const data = await firestoreService.getAllUsers();
        setUsers(data);
      }
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (issue: Issue, newStatus: typeof STATUS_OPTIONS[number]) => {
    try {
      await firestoreService.updateIssueStatus(issue.id, newStatus);
      setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: newStatus } : i));
    } catch (err) {
      Alert.alert('Error', 'Failed to update status.');
    }
  };

  const handleDeleteIssue = (issue: Issue) => {
    Alert.alert('Delete Issue', `Are you sure you want to remove "${issue.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await firestoreService.deleteIssue(issue.id, user?.name || 'Admin');
            setIssues(prev => prev.filter(i => i.id !== issue.id));
          } catch (err) {
            Alert.alert('Error', 'Failed to delete issue.');
          }
        }
      }
    ]);
  };

  const handleBanUser = (u: UserRecord) => {
    const isBanned = u.banType !== 'none';
    Alert.alert(
      isBanned ? 'Unban User' : 'Ban User',
      `${isBanned ? 'Unban' : 'Ban'} ${u.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBanned ? 'Unban' : 'Ban', style: 'destructive',
          onPress: async () => {
            try {
              await firestoreService.updateUserRecord(u.id, {
                banType: isBanned ? 'none' : 'permanent',
                bannedAt: isBanned ? undefined : new Date().toISOString(),
              });
              setUsers(prev => prev.map(usr => usr.id === u.id
                ? { ...usr, banType: isBanned ? 'none' : 'permanent' }
                : usr
              ));
            } catch (err) {
              Alert.alert('Error', 'Failed to update user.');
            }
          }
        }
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed" size={48} color="#e5e7eb" />
        <Text style={styles.noAccessText}>ADMIN ACCESS REQUIRED</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.heading}>Admin Panel</Text>
        <Text style={styles.subheading}>CIVICPULSE CONTROL CENTER</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'issues' && styles.tabActive]}
          onPress={() => setTab('issues')}
        >
          <Ionicons name="list" size={16} color={tab === 'issues' ? '#2563eb' : '#9ca3af'} />
          <Text style={[styles.tabText, tab === 'issues' && styles.tabTextActive]}>Issues</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => setTab('users')}
        >
          <Ionicons name="people" size={16} color={tab === 'users' ? '#2563eb' : '#9ca3af'} />
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {tab === 'issues' && issues.map(issue => (
            <View key={issue.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{issue.title}</Text>
              <Text style={styles.cardMeta}>
                {new Date(issue.createdAt).toLocaleDateString()} · {issue.upvoteCount} upvotes
              </Text>

              {/* Status Switcher */}
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusChip, issue.status === s && styles.statusChipActive]}
                    onPress={() => handleStatusChange(issue, s)}
                  >
                    <Text style={[styles.statusChipText, issue.status === s && styles.statusChipTextActive]}>
                      {s.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteIssue(issue)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={styles.deleteBtnText}>Remove Issue</Text>
              </TouchableOpacity>
            </View>
          ))}

          {tab === 'users' && users.map(u => (
            <View key={u.id} style={styles.card}>
              <View style={styles.userRow}>
                {u.photoURL ? (
                  <Image source={{ uri: u.photoURL }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarPlaceholder}>
                    <Ionicons name="person" size={16} color="#9ca3af" />
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={styles.userTags}>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>{u.role.toUpperCase()}</Text>
                    </View>
                    {u.banType !== 'none' && (
                      <View style={styles.bannedTag}>
                        <Text style={styles.bannedTagText}>BANNED</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {u.role !== 'super_admin' && (
                <TouchableOpacity
                  style={[styles.banBtn, u.banType !== 'none' && styles.unbanBtn]}
                  onPress={() => handleBanUser(u)}
                >
                  <Ionicons
                    name={u.banType !== 'none' ? "checkmark-circle-outline" : "ban-outline"}
                    size={14}
                    color={u.banType !== 'none' ? '#16a34a' : '#dc2626'}
                  />
                  <Text style={[styles.banBtnText, u.banType !== 'none' && styles.unbanBtnText]}>
                    {u.banType !== 'none' ? 'Unban User' : 'Ban User'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noAccessText: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 2 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  heading: { fontSize: 26, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  subheading: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 3, marginTop: 2 },

  tabs: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  tabActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
  tabTextActive: { color: '#2563eb' },

  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6', padding: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardMeta: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 12 },

  statusRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statusChip: {
    flex: 1, paddingVertical: 7, borderRadius: 8,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  statusChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  statusChipText: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.5 },
  statusChipTextActive: { color: '#ffffff' },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },

  userRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 14 },
  userAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  userTags: { flexDirection: 'row', gap: 6 },
  roleTag: { backgroundColor: '#dbeafe', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  roleTagText: { fontSize: 9, fontWeight: '900', color: '#1d4ed8', letterSpacing: 0.5 },
  bannedTag: { backgroundColor: '#fee2e2', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  bannedTagText: { fontSize: 9, fontWeight: '900', color: '#dc2626', letterSpacing: 0.5 },

  banBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unbanBtn: {},
  banBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  unbanBtnText: { color: '#16a34a' },
});
