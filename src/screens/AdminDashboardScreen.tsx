// src/screens/AdminDashboardScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, SafeAreaView, Image, TextInput,
  Modal, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { useApp } from '../context/AppContext';
import { Issue, Comment, UserRecord, LoginRecord } from '../types';
import { CATEGORIES } from '../constants';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

type AdminTab = 'issues' | 'users' | 'activity';
type IssueFilter = 'all' | 'open' | 'acknowledged' | 'resolved';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#fee2e2', text: '#dc2626' },
  acknowledged: { bg: '#fef3c7', text: '#d97706' },
  resolved: { bg: '#dcfce7', text: '#16a34a' },
};

export default function AdminDashboardScreen() {
  const { user, isAdmin } = useApp();
  const isSuperAdmin = user?.role === 'super_admin';
  const [tab, setTab] = useState<AdminTab>('issues');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [bannedUsers, setBannedUsers] = useState<UserRecord[]>([]);
  const [deletedIssues, setDeletedIssues] = useState<Issue[]>([]);
  const [deletedComments, setDeletedComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [userSearch, setUserSearch] = useState('');

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [userIssues, setUserIssues] = useState<Issue[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);
  const [userModalLoading, setUserModalLoading] = useState(false);
  const [banDuration, setBanDuration] = useState('24');
  const [banUnit, setBanUnit] = useState<'hours' | 'days'>('hours');
  const [banPermanent, setBanPermanent] = useState(false);
  const [banReason, setBanReason] = useState('');

  // Activity sections collapsed state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    banned: true, deleted: false, registered: false, logins: false,
  });
  const [activitySearch, setActivitySearch] = useState('');

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'issues') {
        const data = await firestoreService.getIssues('newest');
        setIssues(data);
      } else if (tab === 'users') {
        const data = await firestoreService.getAllUsers();
        setUsers(data);
      } else {
        const [banned, delIssues, delComments, logins, allUsers] = await Promise.all([
          firestoreService.getBannedUsers(),
          firestoreService.getDeletedIssues(),
          firestoreService.getDeletedComments(),
          firestoreService.getLoginHistory(100),
          firestoreService.getAllUsers(),
        ]);
        setBannedUsers(banned);
        setDeletedIssues(delIssues);
        setDeletedComments(delComments);
        setLoginHistory(logins);
        setUsers(allUsers);
      }
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const totalReports = issues.length;
  const openCount = issues.filter(i => i.status === 'open').length;
  const ackCount = issues.filter(i => i.status === 'acknowledged').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const totalVotes = issues.reduce((s, i) => s + i.upvoteCount, 0);

  const filteredIssues = issueFilter === 'all'
    ? issues
    : issues.filter(i => i.status === issueFilter);

  const filteredUsers = userSearch
    ? users.filter(u =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
    )
    : users;

  // --- Issue actions ---
  const promptStatusChange = (issue: Issue, newStatus: 'acknowledged' | 'resolved') => {
    Alert.prompt(
      `Mark as ${newStatus}`,
      'Optional public status note:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async (note?: string) => {
            try {
              await firestoreService.updateIssueStatus(issue.id, newStatus, note || '');
              setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: newStatus, statusNote: note || '' } : i));
            } catch {
              Alert.alert('Error', 'Failed to update status.');
            }
          }
        }
      ],
      'plain-text',
      ''
    );
  };

  const handleStatusChange = (issue: Issue, newStatus: 'acknowledged' | 'resolved') => {
    if (Platform.OS === 'ios') {
      promptStatusChange(issue, newStatus);
    } else {
      // Android doesn't support Alert.prompt, just change status
      Alert.alert(`Mark as ${newStatus}?`, `Change status of "${issue.title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await firestoreService.updateIssueStatus(issue.id, newStatus);
              setIssues(prev => prev.map(i => i.id === issue.id ? { ...i, status: newStatus } : i));
            } catch {
              Alert.alert('Error', 'Failed to update status.');
            }
          }
        }
      ]);
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
          } catch {
            Alert.alert('Error', 'Failed to delete issue.');
          }
        }
      }
    ]);
  };

  // --- User detail modal ---
  const openUserModal = async (u: UserRecord) => {
    setSelectedUser(u);
    setUserModalLoading(true);
    setBanDuration('24');
    setBanUnit('hours');
    setBanPermanent(false);
    setBanReason('');
    try {
      const [issues, comments] = await Promise.all([
        firestoreService.getIssuesByUser(u.id),
        firestoreService.getCommentsByUser(u.id),
      ]);
      setUserIssues(issues);
      setUserComments(comments);
    } catch {
      setUserIssues([]);
      setUserComments([]);
    } finally {
      setUserModalLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    try {
      if (banPermanent) {
        await firestoreService.banUser(selectedUser.id, 'permanent', banReason);
      } else {
        const hours = banUnit === 'days' ? parseInt(banDuration) * 24 : parseInt(banDuration);
        await firestoreService.banUser(selectedUser.id, 'temporary', banReason, hours);
      }
      Alert.alert('User Banned', `${selectedUser.name} has been banned.`);
      setSelectedUser({ ...selectedUser, banType: banPermanent ? 'permanent' : 'temporary' });
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to ban user.');
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    try {
      await firestoreService.unbanUser(selectedUser.id);
      Alert.alert('User Unbanned', `${selectedUser.name} has been unbanned.`);
      setSelectedUser({ ...selectedUser, banType: 'none' });
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to unban user.');
    }
  };

  const handlePromote = async () => {
    if (!selectedUser) return;
    Alert.alert('Promote to Admin', `Promote ${selectedUser.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Promote', onPress: async () => {
          try {
            await firestoreService.setUserRole(selectedUser.id, 'admin');
            setSelectedUser({ ...selectedUser, role: 'admin' });
            loadData();
          } catch { Alert.alert('Error', 'Failed to promote.'); }
        }
      }
    ]);
  };

  const handleDemote = async () => {
    if (!selectedUser) return;
    Alert.alert('Demote to Resident', `Demote ${selectedUser.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Demote', style: 'destructive', onPress: async () => {
          try {
            await firestoreService.setUserRole(selectedUser.id, 'resident');
            setSelectedUser({ ...selectedUser, role: 'resident' });
            loadData();
          } catch { Alert.alert('Error', 'Failed to demote.'); }
        }
      }
    ]);
  };

  const handleDeleteComment = (c: Comment) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await firestoreService.deleteComment(c.id, user?.name || 'Admin');
            setUserComments(prev => prev.filter(x => x.id !== c.id));
          } catch { Alert.alert('Error', 'Failed to delete comment.'); }
        }
      }
    ]);
  };

  // --- Activity helpers ---
  const handleRestoreIssue = async (issue: Issue) => {
    try {
      await firestoreService.restoreIssue(issue.id);
      setDeletedIssues(prev => prev.filter(i => i.id !== issue.id));
    } catch {
      Alert.alert('Error', 'Failed to restore issue.');
    }
  };

  const handleRestoreComment = async (comment: Comment) => {
    try {
      await firestoreService.restoreComment(comment.id);
      setDeletedComments(prev => prev.filter(c => c.id !== comment.id));
    } catch {
      Alert.alert('Error', 'Failed to restore comment.');
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const userLoginCount = (userId: string) => loginHistory.filter(l => l.userId === userId).length;

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

      {/* Header Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalReports}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{loginHistory.length}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
      </View>

      {/* 3-Tab Navigation */}
      <View style={styles.tabs}>
        {(['issues', 'users', 'activity'] as AdminTab[]).map(t => {
          const icons: Record<AdminTab, keyof typeof Ionicons.glyphMap> = {
            issues: 'list', users: 'people', activity: 'pulse',
          };
          return (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Ionicons name={icons[t]} size={16} color={tab === t ? COLORS.primary : COLORS.textMuted} />
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ============ ISSUES TAB ============ */}
          {tab === 'issues' && (
            <>
              {/* Filter Cards */}
              <View style={styles.filterRow}>
                {([
                  { key: 'all' as IssueFilter, label: 'Total', count: totalReports, color: COLORS.primary },
                  { key: 'open' as IssueFilter, label: 'Open', count: openCount, color: '#dc2626' },
                  { key: 'acknowledged' as IssueFilter, label: 'Ack', count: ackCount, color: '#d97706' },
                  { key: 'resolved' as IssueFilter, label: 'Done', count: resolvedCount, color: '#16a34a' },
                ]).map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.filterCard, issueFilter === f.key && { borderColor: f.color }]}
                    onPress={() => setIssueFilter(f.key)}
                  >
                    <Text style={[styles.filterCount, { color: f.color }]}>{f.count}</Text>
                    <Text style={styles.filterLabel}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
                <View style={[styles.filterCard, { borderColor: COLORS.border }]}>
                  <Text style={[styles.filterCount, { color: COLORS.primary }]}>{totalVotes}</Text>
                  <Text style={styles.filterLabel}>Votes</Text>
                </View>
              </View>

              {filteredIssues.map(issue => {
                const cat = CATEGORIES.find(c => c.id === issue.categoryId);
                const sc = STATUS_COLORS[issue.status] || STATUS_COLORS.open;
                return (
                  <View key={issue.id} style={styles.card}>
                    <View style={styles.issueCardRow}>
                      {issue.photos.length > 0 && (
                        <Image source={{ uri: issue.photos[0].url }} style={styles.issueThumb} />
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={styles.issueTitleRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{issue.title}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: sc.text }]}>
                              {issue.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.issueDesc} numberOfLines={2}>{issue.description}</Text>
                        <View style={styles.issueMetaRow}>
                          {issue.creatorPhotoURL ? (
                            <Image source={{ uri: issue.creatorPhotoURL }} style={styles.tinyAvatar} />
                          ) : (
                            <View style={styles.tinyAvatarPlaceholder}>
                              <Ionicons name="person" size={8} color="#9ca3af" />
                            </View>
                          )}
                          <Text style={styles.issueMeta}>{issue.creatorName}</Text>
                          <Text style={styles.issueMeta}>· {cat?.name || ''}</Text>
                          <Text style={styles.issueMeta}>· {new Date(issue.createdAt).toLocaleDateString()}</Text>
                          <Text style={styles.issueMeta}>· ▲ {issue.upvoteCount}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                      {issue.status !== 'acknowledged' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: '#d97706' }]}
                          onPress={() => handleStatusChange(issue, 'acknowledged')}
                        >
                          <Text style={[styles.actionBtnText, { color: '#d97706' }]}>Ack</Text>
                        </TouchableOpacity>
                      )}
                      {issue.status !== 'resolved' && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: '#16a34a' }]}
                          onPress={() => handleStatusChange(issue, 'resolved')}
                        >
                          <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Resolve</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: COLORS.error }]}
                        onPress={() => handleDeleteIssue(issue)}
                      >
                        <Ionicons name="trash-outline" size={12} color={COLORS.error} />
                        <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* ============ USERS TAB ============ */}
          {tab === 'users' && (
            <>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor={COLORS.textMuted}
                  value={userSearch}
                  onChangeText={setUserSearch}
                />
              </View>

              {filteredUsers.map(u => (
                <TouchableOpacity key={u.id} style={styles.card} onPress={() => openUserModal(u)} activeOpacity={0.7}>
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
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* ============ ACTIVITY TAB ============ */}
          {tab === 'activity' && (
            <>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search activity..."
                  placeholderTextColor={COLORS.textMuted}
                  value={activitySearch}
                  onChangeText={setActivitySearch}
                />
              </View>

              {/* Banned Users */}
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('banned')}>
                <Text style={styles.sectionTitle}>Banned Users ({bannedUsers.length})</Text>
                <Ionicons name={expandedSections.banned ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              {expandedSections.banned && bannedUsers.map(u => (
                <View key={u.id} style={styles.activityCard}>
                  <Text style={styles.activityName}>{u.name}</Text>
                  <Text style={styles.activityMeta}>
                    {u.banType === 'permanent' ? '🔴 Permanent' : `⏳ Temporary — expires ${u.bannedUntil ? new Date(u.bannedUntil).toLocaleDateString() : 'N/A'}`}
                  </Text>
                  {u.banReason ? <Text style={styles.activityMeta}>Reason: {u.banReason}</Text> : null}
                </View>
              ))}

              {/* Deleted Items */}
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('deleted')}>
                <Text style={styles.sectionTitle}>Deleted Items ({deletedIssues.length + deletedComments.length})</Text>
                <Ionicons name={expandedSections.deleted ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              {expandedSections.deleted && (
                <>
                  {deletedIssues.map(i => (
                    <View key={i.id} style={styles.activityCard}>
                      <View style={styles.activityCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityName}>Issue: {i.title}</Text>
                          <Text style={styles.activityMeta}>Deleted by {i.deletedByName} · {i.deletedAt ? new Date(i.deletedAt).toLocaleDateString() : ''}</Text>
                        </View>
                        <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestoreIssue(i)}>
                          <Text style={styles.restoreBtnText}>Restore</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {deletedComments.map(c => (
                    <View key={c.id} style={styles.activityCard}>
                      <View style={styles.activityCardRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityName}>Comment by {c.userName}</Text>
                          <Text style={styles.activityMeta} numberOfLines={1}>{c.body}</Text>
                          <Text style={styles.activityMeta}>Deleted by {c.deletedByName}</Text>
                        </View>
                        <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestoreComment(c)}>
                          <Text style={styles.restoreBtnText}>Restore</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Registered Users */}
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('registered')}>
                <Text style={styles.sectionTitle}>Registered Users ({users.length})</Text>
                <Ionicons name={expandedSections.registered ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              {expandedSections.registered && users
                .filter(u => !activitySearch || u.name.toLowerCase().includes(activitySearch.toLowerCase()) || u.email.toLowerCase().includes(activitySearch.toLowerCase()))
                .map(u => (
                  <View key={u.id} style={styles.activityCard}>
                    <Text style={styles.activityName}>{u.name}</Text>
                    <Text style={styles.activityMeta}>{u.email} · {userLoginCount(u.id)} logins</Text>
                  </View>
                ))}

              {/* Recent Logins */}
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('logins')}>
                <Text style={styles.sectionTitle}>Recent Logins ({loginHistory.length})</Text>
                <Ionicons name={expandedSections.logins ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
              {expandedSections.logins && loginHistory
                .filter(l => !activitySearch || l.name.toLowerCase().includes(activitySearch.toLowerCase()) || l.email.toLowerCase().includes(activitySearch.toLowerCase()))
                .slice(0, 50)
                .map(l => (
                  <View key={l.id} style={styles.activityCard}>
                    <Text style={styles.activityName}>{l.name}</Text>
                    <Text style={styles.activityMeta}>{l.email} · {new Date(l.loginAt).toLocaleString()}</Text>
                    <Text style={styles.activityMeta} numberOfLines={1}>{l.userAgent}</Text>
                  </View>
                ))}
            </>
          )}
        </ScrollView>
      )}

      {/* ============ USER DETAIL MODAL ============ */}
      <Modal visible={!!selectedUser} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>User Details</Text>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* User header */}
              <View style={styles.modalUserHeader}>
                {selectedUser.photoURL ? (
                  <Image source={{ uri: selectedUser.photoURL }} style={styles.modalAvatar} />
                ) : (
                  <View style={[styles.modalAvatar, styles.userAvatarPlaceholder]}>
                    <Ionicons name="person" size={32} color="#9ca3af" />
                  </View>
                )}
                <Text style={styles.modalUserName}>{selectedUser.name}</Text>
                <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                <View style={styles.userTags}>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>{selectedUser.role.toUpperCase()}</Text>
                  </View>
                  {selectedUser.banType !== 'none' && (
                    <View style={styles.bannedTag}>
                      <Text style={styles.bannedTagText}>{selectedUser.banType.toUpperCase()} BAN</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Dates */}
              <View style={styles.dateRow}>
                <Text style={styles.dateMeta}>First seen: {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</Text>
                <Text style={styles.dateMeta}>Last seen: {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString() : 'N/A'}</Text>
                <Text style={styles.dateMeta}>Total logins: {userLoginCount(selectedUser.id)}</Text>
              </View>

              {userModalLoading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 32 }} />
              ) : (
                <>
                  {/* User's Issues */}
                  <Text style={styles.modalSectionLabel}>ISSUES ({userIssues.length})</Text>
                  {userIssues.length === 0 ? (
                    <Text style={styles.emptyText}>No issues posted</Text>
                  ) : (
                    userIssues.map(i => (
                      <View key={i.id} style={styles.miniCard}>
                        <Text style={styles.miniCardTitle} numberOfLines={1}>{i.title}</Text>
                        <Text style={styles.miniCardMeta}>{i.status} · {new Date(i.createdAt).toLocaleDateString()} · ▲ {i.upvoteCount}</Text>
                      </View>
                    ))
                  )}

                  {/* User's Comments */}
                  <Text style={styles.modalSectionLabel}>COMMENTS ({userComments.length})</Text>
                  {userComments.length === 0 ? (
                    <Text style={styles.emptyText}>No comments posted</Text>
                  ) : (
                    userComments.map(c => (
                      <View key={c.id} style={styles.miniCard}>
                        <Text style={styles.miniCardTitle} numberOfLines={2}>{c.body}</Text>
                        <View style={styles.miniCardRow}>
                          <Text style={styles.miniCardMeta}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                          <TouchableOpacity onPress={() => handleDeleteComment(c)}>
                            <Text style={styles.deleteLink}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}

                  {/* Ban Controls */}
                  {selectedUser.role !== 'super_admin' && (
                    <>
                      <Text style={styles.modalSectionLabel}>BAN CONTROLS</Text>
                      {selectedUser.banType !== 'none' ? (
                        <TouchableOpacity style={styles.unbanFullBtn} onPress={handleUnbanUser}>
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.unbanFullBtnText}>Unban User</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.banControls}>
                          <View style={styles.banRow}>
                            <TextInput
                              style={[styles.banInput, { flex: 1 }]}
                              placeholder="Duration"
                              placeholderTextColor={COLORS.textMuted}
                              value={banDuration}
                              onChangeText={setBanDuration}
                              keyboardType="numeric"
                              editable={!banPermanent}
                            />
                            <TouchableOpacity
                              style={[styles.unitBtn, banUnit === 'hours' && styles.unitBtnActive]}
                              onPress={() => setBanUnit('hours')}
                              disabled={banPermanent}
                            >
                              <Text style={[styles.unitBtnText, banUnit === 'hours' && styles.unitBtnTextActive]}>Hours</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.unitBtn, banUnit === 'days' && styles.unitBtnActive]}
                              onPress={() => setBanUnit('days')}
                              disabled={banPermanent}
                            >
                              <Text style={[styles.unitBtnText, banUnit === 'days' && styles.unitBtnTextActive]}>Days</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.permToggle}
                            onPress={() => setBanPermanent(!banPermanent)}
                          >
                            <Ionicons name={banPermanent ? 'checkbox' : 'square-outline'} size={20} color={COLORS.error} />
                            <Text style={styles.permToggleText}>Permanent ban</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={[styles.banInput, { minHeight: 60 }]}
                            placeholder="Ban reason (optional)..."
                            placeholderTextColor={COLORS.textMuted}
                            value={banReason}
                            onChangeText={setBanReason}
                            multiline
                          />
                          <TouchableOpacity style={styles.banFullBtn} onPress={handleBanUser}>
                            <Ionicons name="ban" size={18} color="#fff" />
                            <Text style={styles.banFullBtnText}>Apply Ban</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Promote / Demote */}
                      {isSuperAdmin && selectedUser.role !== 'super_admin' && (
                        <View style={styles.promoteRow}>
                          {selectedUser.role === 'resident' || selectedUser.role === 'guest' ? (
                            <TouchableOpacity style={styles.promoteBtn} onPress={handlePromote}>
                              <Ionicons name="arrow-up-circle" size={16} color={COLORS.primary} />
                              <Text style={styles.promoteBtnText}>Promote to Admin</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.demoteBtn} onPress={handleDemote}>
                              <Ionicons name="arrow-down-circle" size={16} color={COLORS.warning} />
                              <Text style={styles.demoteBtnText}>Demote to Resident</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  noAccessText: { ...TYPOGRAPHY.sectionLabel, color: COLORS.textMuted },

  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xs },
  heading: { ...TYPOGRAPHY.pageTitle, fontSize: 26, color: COLORS.textPrimary },
  subheading: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, marginTop: SPACING.xs },

  // Header stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm,
    marginTop: SPACING.sm, marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    alignItems: 'center', ...SHADOWS.subtle,
  },
  statNumber: { ...TYPOGRAPHY.cardTitle, fontSize: 22, color: COLORS.primary },
  statLabel: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, marginTop: 2 },

  // Tabs
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.sm },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder },
  tabText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.sm },

  // Issue filter cards
  filterRow: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm },
  filterCard: {
    flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    borderWidth: 2, borderColor: COLORS.border, padding: SPACING.sm,
    alignItems: 'center',
  },
  filterCount: { fontSize: 18, fontWeight: '900' },
  filterLabel: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, marginTop: 2 },

  // Cards
  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    ...SHADOWS.subtle,
  },
  cardTitle: { ...TYPOGRAPHY.cardTitle, fontSize: 15, color: COLORS.textPrimary, flex: 1 },

  // Issue card
  issueCardRow: { flexDirection: 'row', gap: SPACING.sm },
  issueThumb: { width: 56, height: 56, borderRadius: BORDER_RADIUS.sm },
  issueTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 2 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BORDER_RADIUS.round },
  statusBadgeText: { ...TYPOGRAPHY.microLabel, letterSpacing: 0.5 },
  issueDesc: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginBottom: SPACING.xs, lineHeight: 16 },
  issueMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, flexWrap: 'wrap' },
  tinyAvatar: { width: 14, height: 14, borderRadius: 7 },
  tinyAvatarPlaceholder: { width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  issueMeta: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm, borderWidth: 1,
  },
  actionBtnText: { ...TYPOGRAPHY.microLabel, fontWeight: '800' },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, paddingVertical: SPACING.md, ...TYPOGRAPHY.body, color: COLORS.textPrimary },

  // User row
  userRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  userAvatar: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md },
  userAvatarPlaceholder: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  userInfo: { flex: 1 },
  userName: { ...TYPOGRAPHY.cardTitle, fontSize: 14, color: COLORS.textPrimary, marginBottom: 2 },
  userEmail: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginBottom: SPACING.xs },
  userTags: { flexDirection: 'row', gap: SPACING.xs },
  roleTag: { backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.round, paddingHorizontal: SPACING.xs, paddingVertical: 2 },
  roleTagText: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, letterSpacing: 0.5 },
  bannedTag: { backgroundColor: '#fee2e2', borderRadius: BORDER_RADIUS.round, paddingHorizontal: SPACING.xs, paddingVertical: 2 },
  bannedTagText: { ...TYPOGRAPHY.microLabel, color: COLORS.error, letterSpacing: 0.5 },

  // Activity
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  sectionTitle: { ...TYPOGRAPHY.cardTitle, fontSize: 14, color: COLORS.textPrimary },
  activityCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  activityCardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  activityName: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  activityMeta: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, fontWeight: '600', lineHeight: 16 },
  restoreBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primaryBorder,
  },
  restoreBtnText: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, fontWeight: '800' },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { ...TYPOGRAPHY.cardTitle, fontSize: 18, color: COLORS.textPrimary },
  modalUserHeader: { alignItems: 'center', paddingVertical: SPACING.xl },
  modalAvatar: { width: 72, height: 72, borderRadius: 36, marginBottom: SPACING.sm },
  modalUserName: { ...TYPOGRAPHY.cardTitle, fontSize: 20, color: COLORS.textPrimary, marginBottom: 2 },
  modalUserEmail: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, marginBottom: SPACING.sm },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  dateMeta: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, fontWeight: '600' },

  modalSectionLabel: { ...TYPOGRAPHY.sectionLabel, color: COLORS.textMuted, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.md },
  miniCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.xs,
  },
  miniCardTitle: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  miniCardMeta: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, fontWeight: '600' },
  miniCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteLink: { ...TYPOGRAPHY.microLabel, color: COLORS.error, fontWeight: '800' },

  // Ban controls
  banControls: { gap: SPACING.sm },
  banRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  banInput: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body, color: COLORS.textPrimary,
  },
  unitBtn: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  unitBtnActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder },
  unitBtnText: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, fontWeight: '800' },
  unitBtnTextActive: { color: COLORS.primary },
  permToggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  permToggleText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.error },
  banFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.error, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md, ...SHADOWS.colored(COLORS.error),
  },
  banFullBtnText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  unbanFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.success, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md, ...SHADOWS.colored(COLORS.success),
  },
  unbanFullBtnText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  promoteRow: { marginTop: SPACING.lg },
  promoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  promoteBtnText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.primary },
  demoteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.warning, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  demoteBtnText: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.warning },
});
