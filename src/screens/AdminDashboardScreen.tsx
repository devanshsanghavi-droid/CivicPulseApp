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
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

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

      {/* 3-Tab Navigation */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'issues' && styles.tabActive]}
          onPress={() => setTab('issues')}
        >
          <Ionicons name="list" size={16} color={tab === 'issues' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'issues' && styles.tabTextActive]}>Issues</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'users' && styles.tabActive]}
          onPress={() => setTab('users')}
        >
          <Ionicons name="people" size={16} color={tab === 'users' ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {tab === 'issues' && issues.map(issue => (
            <View key={issue.id} style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{issue.title}</Text>
              <Text style={styles.cardMeta}>
                {new Date(issue.createdAt).toLocaleDateString()} · {issue.upvoteCount} upvotes
              </Text>

              {/* Status Filter Chips */}
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
                <Ionicons name="trash-outline" size={14} color={COLORS.error} />
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
                    color={u.banType !== 'none' ? COLORS.success : COLORS.error}
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
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  noAccessText: { ...TYPOGRAPHY.sectionLabel, color: COLORS.textMuted },

  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  heading: { ...TYPOGRAPHY.pageTitle, fontSize: 26, color: COLORS.textPrimary },
  subheading: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, marginTop: SPACING.xs },

  // 3-Tab Navigation
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.sm },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder },
  tabText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.sm },

  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    ...SHADOWS.subtle,
  },
  cardTitle: { ...TYPOGRAPHY.cardTitle, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  cardMeta: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '600', marginBottom: SPACING.sm },

  // Status Filter Chips
  statusRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  statusChip: {
    flex: 1, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusChipText: { ...TYPOGRAPHY.microLabel, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 0.5 },
  statusChipTextActive: { color: '#ffffff' },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  deleteBtnText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.error },

  userRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  userAvatar: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md },
  userAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { ...TYPOGRAPHY.cardTitle, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  userEmail: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginBottom: SPACING.sm },
  userTags: { flexDirection: 'row', gap: SPACING.xs },
  roleTag: { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.round, paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs },
  roleTagText: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, letterSpacing: 0.5 },
  bannedTag: { backgroundColor: '#fee2e2', borderRadius: BORDER_RADIUS.round, paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs },
  bannedTagText: { ...TYPOGRAPHY.microLabel, color: COLORS.error, letterSpacing: 0.5 },

  banBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  unbanBtn: {},
  banBtnText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.error },
  unbanBtnText: { color: COLORS.success },
});
