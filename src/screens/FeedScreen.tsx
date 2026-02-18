// src/screens/FeedScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Image, SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { Issue } from '../types';
import { CATEGORIES } from '../constants';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#fee2e2', text: '#b91c1c' },
  acknowledged: { bg: '#fef9c3', text: '#a16207' },
  resolved: { bg: '#dcfce7', text: '#15803d' },
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
        <Text style={styles.cardTitle}>{issue.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{issue.description}</Text>

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
            <Ionicons name="thumbsup" size={14} color="#2563eb" />
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

  useEffect(() => { loadIssues(); }, [loadIssues]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search city issues..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={[{ id: undefined, name: 'All Reports' }, ...CATEGORIES]}
        keyExtractor={(item) => item.id || 'all'}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filterCat === item.id && styles.filterChipActive]}
            onPress={() => setFilterCat(item.id)}
          >
            <Text style={[styles.filterChipText, filterCat === item.id && styles.filterChipTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

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
          renderItem={({ item }) => (
            <IssueCard
              issue={item}
              onPress={() => navigation.navigate('IssueDetail', { issueId: item.id })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },

  filterList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 100, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  filterChipTextActive: { color: '#ffffff' },

  sortRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  sortCount: { fontSize: 11, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  sortBtns: { flexDirection: 'row', gap: 4 },
  sortBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sortBtnActive: { backgroundColor: '#eff6ff' },
  sortBtnText: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  sortBtnTextActive: { color: '#2563eb' },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 20,
    borderWidth: 1, borderColor: '#f3f4f6',
    overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardImageWrap: { height: 180, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImageBadge: { position: 'absolute', top: 12, left: 12 },
  cardBody: { padding: 16 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardCategory: { fontSize: 10, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  cardDate: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6, lineHeight: 24 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f9fafb', paddingTop: 12 },
  cardAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  avatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  authorName: { fontSize: 12, fontWeight: '700', color: '#4b5563', maxWidth: 120 },
  upvoteRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  upvoteCount: { fontSize: 14, fontWeight: '900', color: '#111827' },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 11, fontWeight: '800', color: '#9ca3af', letterSpacing: 2 },
  emptyText: { fontSize: 11, fontWeight: '800', color: '#d1d5db', letterSpacing: 1.5 },
});
