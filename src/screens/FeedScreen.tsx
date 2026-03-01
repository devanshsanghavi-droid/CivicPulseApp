// src/screens/FeedScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Image, SafeAreaView, RefreshControl, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { Issue } from '../types';
import { CATEGORIES } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

type Nav = StackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#fee2e2', text: '#dc2626' },
  acknowledged: { bg: '#fef3c7', text: '#d97706' },
  resolved: { bg: '#dcfce7', text: '#16a34a' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{status.toUpperCase()}</Text>
    </View>
  );
};

const IssueCard = ({ issue, onPress }: { issue: Issue; onPress: () => void }) => {
  const category = CATEGORIES.find(c => c.id === issue.categoryId);
  const photo = issue.photos[0]?.url;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {photo && (
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: photo }} style={styles.cardImage} />
          <View style={styles.cardImageBadge}>
            <StatusBadge status={issue.status} />
          </View>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          <Text style={styles.cardCategory}>{category?.name}</Text>
          {!photo && <StatusBadge status={issue.status} />}
          <Text style={styles.cardDate}>
            {new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{issue.title || 'Untitled Issue'}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{issue.description || 'No description available'}</Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardAuthor}>
            {issue.creatorPhotoURL ? (
              <Image source={{ uri: issue.creatorPhotoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={12} color="#9ca3af" />
              </View>
            )}
            <Text style={styles.authorName} numberOfLines={1}>{issue.creatorName}</Text>
          </View>
          <View style={styles.upvoteRow}>
            <Ionicons name="thumbs-up" size={14} color="#2563eb" />
            <Text style={styles.upvoteCount}>{issue.upvoteCount}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [sort, setSort] = useState('trending');
  const [filterCat, setFilterCat] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const data = await firestoreService.getIssues(sort, filterCat);
      const filtered = data.filter(i =>
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        i.description.toLowerCase().includes(search.toLowerCase())
      );
      setIssues(filtered);
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  }, [sort, filterCat, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadIssues();
    setRefreshing(false);
  }, [loadIssues]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        {/* Search */}
        <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search city issues..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter - Horizontally Scrollable */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[{ id: undefined, name: 'All Reports' }, ...CATEGORIES].map(item => (
            <TouchableOpacity
              key={item.id || 'all'}
              style={[styles.filterChip, filterCat === item.id && styles.filterChipActive]}
              onPress={() => setFilterCat(item.id)}
            >
              <Text style={[styles.filterChipText, filterCat === item.id && styles.filterChipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Row */}
      <View style={styles.sortRow}>
        <Text style={styles.sortCount}>{issues.length} {issues.length === 1 ? 'Report' : 'Reports'}</Text>
        <View style={styles.sortBtns}>
          {['trending', 'newest', 'upvoted'].map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSort(s)}
              style={[styles.sortBtn, sort === s && styles.sortBtnActive]}
            >
              <Text style={[styles.sortBtnText, sort === s && styles.sortBtnTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Issues List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>LOADING REPORTS...</Text>
        </View>
      ) : issues.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search" size={48} color="#e5e7eb" />
          <Text style={styles.emptyText}>NO MATCHING RECORDS FOUND</Text>
        </View>
      ) : (
        <FlatList
          data={issues}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          renderItem={({ item }) => (
            <IssueCard
              issue={item}
              onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })}
            />
          )}
        />
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchIcon: { marginRight: SPACING.sm },
  searchInput: { flex: 1, ...TYPOGRAPHY.body, fontSize: 15, color: COLORS.textPrimary },

  filterContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  filterScroll: { 
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.lg, paddingVertical: 7,
    borderRadius: BORDER_RADIUS.round, backgroundColor: COLORS.cardBackground,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#ffffff' },

  sortRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  sortCount: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted },
  sortBtns: { flexDirection: 'row', gap: 4 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BORDER_RADIUS.sm },
  sortBtnActive: { backgroundColor: COLORS.primaryLight },
  sortBtnText: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted },
  sortBtnTextActive: { color: COLORS.primary },

  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md },

  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.subtle,
  },
  cardImageWrap: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImageBadge: { position: 'absolute', top: 12, left: 12 },
  cardBody: { padding: 16 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  cardCategory: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, flex: 1 },
  cardDate: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  cardTitle: { ...TYPOGRAPHY.cardTitle, color: COLORS.textPrimary, marginBottom: 6, lineHeight: 24 },
  cardDesc: { ...TYPOGRAPHY.body, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f9fafb', paddingTop: 12 },
  cardAuthor: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  avatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  authorName: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary, maxWidth: 120 },
  upvoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  upvoteCount: { ...TYPOGRAPHY.body, fontSize: 14, fontWeight: '900', color: COLORS.textPrimary },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.round },
  badgeText: { ...TYPOGRAPHY.microLabel, letterSpacing: 0.5 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, letterSpacing: 2 },
  emptyText: { ...TYPOGRAPHY.microLabel, color: '#d1d5db', letterSpacing: 1.5 },
});
