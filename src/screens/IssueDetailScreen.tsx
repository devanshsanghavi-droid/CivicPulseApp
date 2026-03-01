// src/screens/IssueDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, ActivityIndicator,
  Alert, SafeAreaView, KeyboardAvoidingView
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { storageService } from '../services/storage';
import { Issue, Comment } from '../types';
import { CATEGORIES } from '../constants';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

type RouteType = RouteProp<RootStackParamList, 'IssueDetail'>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#fee2e2', text: '#dc2626' },
  acknowledged: { bg: '#fef3c7', text: '#d97706' },
  resolved: { bg: '#dcfce7', text: '#16a34a' },
};

export default function IssueDetailScreen() {
  const { user } = useApp();
  const route = useRoute<RouteType>();
  const { issueId } = route.params;

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [upvoting, setUpvoting] = useState(false);

  useEffect(() => {
    loadData();
  }, [issueId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [issueData, commentsData] = await Promise.all([
        firestoreService.getIssue(issueId),
        firestoreService.getComments(issueId),
      ]);
      setIssue(issueData);
      setComments(commentsData);
      if (user) {
        setHasUpvoted(await storageService.hasUpvoted(issueId, user.id));
      }
    } catch (err) {
      console.error('IssueDetail load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!user || !issue || upvoting) return;
    setUpvoting(true);
    try {
      const result = await storageService.toggleUpvote(issueId, user.id);
      const isAdding = result === 'added';
      await firestoreService.toggleUpvote(issueId, user.id, isAdding);
      setHasUpvoted(isAdding);
      setIssue(prev => prev ? {
        ...prev,
        upvoteCount: prev.upvoteCount + (isAdding ? 1 : -1)
      } : prev);
    } catch (err) {
      Alert.alert('Error', 'Failed to update upvote. Please try again.');
    } finally {
      setUpvoting(false);
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim() || commenting) return;
    setCommenting(true);
    try {
      const comment = await firestoreService.addComment(
        issueId, user.id, user.name, user.photoURL || '', newComment.trim()
      );
      setComments(prev => [comment, ...prev]);
      setNewComment('');
    } catch (err) {
      Alert.alert('Error', 'Failed to post comment.');
    } finally {
      setCommenting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!issue) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Issue not found.</Text>
      </View>
    );
  }

  const category = CATEGORIES.find(c => c.id === issue.categoryId);
  const statusColors = STATUS_COLORS[issue.status] || STATUS_COLORS.open;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Photos with Page Indicators */}
        {issue.photos.length > 0 && (
          <View style={styles.photoContainer}>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {issue.photos.map((photo, index) => (
                <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} />
              ))}
            </ScrollView>
            {/* Page Indicators */}
            <View style={styles.pageIndicators}>
              {issue.photos.map((_, index) => (
                <View
                  key={index}
                  style={[styles.pageDot, styles.currentPageDot]}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.body}>
          {/* Category + Status */}
          <View style={styles.metaRow}>
            <Text style={styles.category}>{category?.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {issue.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{issue.title}</Text>
          <Text style={styles.description}>{issue.description}</Text>

          {issue.statusNote && (
            <View style={styles.statusNote}>
              <Ionicons name="information-circle" size={16} color="#2563eb" />
              <Text style={styles.statusNoteText}>{issue.statusNote}</Text>
            </View>
          )}

          {/* Reporter + Date */}
          <View style={styles.reporterRow}>
            {issue.creatorPhotoURL ? (
              <Image source={{ uri: issue.creatorPhotoURL }} style={styles.reporterAvatar} />
            ) : (
              <View style={styles.reporterAvatarPlaceholder}>
                <Ionicons name="person" size={14} color="#9ca3af" />
              </View>
            )}
            <Text style={styles.reporterName}>{issue.creatorName}</Text>
            <Text style={styles.reporterDate}>
              {new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          {/* Location */}
          {issue.address && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color="#2563eb" />
              <Text style={styles.locationText}>{issue.address}</Text>
            </View>
          )}

          {/* Upvote Button */}
          <TouchableOpacity
            style={[styles.upvoteBtn, hasUpvoted && styles.upvoteBtnActive]}
            onPress={handleUpvote}
            disabled={!user || upvoting}
            activeOpacity={0.8}
          >
            {upvoting ? (
              <ActivityIndicator size="small" color={hasUpvoted ? '#ffffff' : COLORS.primary} />
            ) : (
              <>
                <Ionicons name={hasUpvoted ? "thumbs-up" : "thumbs-up-outline"} size={18} color={hasUpvoted ? '#ffffff' : COLORS.primary} />
                <Text style={[styles.upvoteBtnText, hasUpvoted && styles.upvoteBtnTextActive]}>
                  {issue.upvoteCount} {issue.upvoteCount === 1 ? 'Upvote' : 'Upvotes'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Comments */}
          <Text style={styles.sectionLabel}>COMMUNITY DISCUSSION</Text>

          {user && (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#9ca3af"
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!newComment.trim() || commenting) && styles.commentSendBtnDisabled]}
                onPress={handleComment}
                disabled={!newComment.trim() || commenting}
              >
                {commenting
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Ionicons name="send" size={16} color="#ffffff" />
                }
              </TouchableOpacity>
            </View>
          )}

          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          ) : (
            comments.map(comment => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  {comment.userPhotoURL ? (
                    <Image source={{ uri: comment.userPhotoURL }} style={styles.commentAvatar} />
                  ) : (
                    <View style={styles.commentAvatarPlaceholder}>
                      <Ionicons name="person" size={12} color="#9ca3af" />
                    </View>
                  )}
                  <Text style={styles.commentAuthor}>{comment.userName}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, fontWeight: '700' },

  // Photo Gallery
  photoContainer: { marginBottom: SPACING.lg },
  photoScroll: { height: 240 },
  photo: { width: 400, height: 240, resizeMode: 'cover' },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  currentPageDot: {
    backgroundColor: COLORS.primary,
  },

  body: { padding: SPACING.lg },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  category: { ...TYPOGRAPHY.microLabel, color: COLORS.primary, flex: 1 },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.round },
  statusText: { ...TYPOGRAPHY.microLabel, letterSpacing: 1 },

  title: { ...TYPOGRAPHY.cardTitle, fontSize: 24, color: COLORS.textPrimary, marginBottom: SPACING.md },
  description: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 24, marginBottom: SPACING.md },

  statusNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  statusNoteText: { ...TYPOGRAPHY.body, fontSize: 13, color: '#1d4ed8', flex: 1, lineHeight: 20 },

  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  reporterAvatar: { width: 28, height: 28, borderRadius: 14 },
  reporterAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  reporterName: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary, flex: 1 },
  reporterDate: { ...TYPOGRAPHY.caption, color: COLORS.textMuted, fontWeight: '600' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xl },
  locationText: { ...TYPOGRAPHY.body, fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  upvoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md, justifyContent: 'center', marginBottom: SPACING.xl,
  },
  upvoteBtnActive: { backgroundColor: COLORS.primary },
  upvoteBtnText: { ...TYPOGRAPHY.body, fontSize: 15, fontWeight: '800', color: COLORS.primary },
  upvoteBtnTextActive: { color: '#ffffff' },

  sectionLabel: { ...TYPOGRAPHY.sectionLabel, color: COLORS.textMuted, marginBottom: SPACING.md },

  commentInputRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, alignItems: 'flex-end' },
  commentInput: {
    flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body, color: COLORS.textPrimary, maxHeight: 100,
  },
  commentSendBtn: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  commentSendBtnDisabled: { backgroundColor: '#93c5fd' },

  noComments: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },

  commentCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
    ...SHADOWS.subtle,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  commentAvatar: { width: 24, height: 24, borderRadius: 12 },
  commentAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  commentAuthor: { ...TYPOGRAPHY.caption, fontWeight: '800', color: COLORS.textSecondary, flex: 1 },
  commentDate: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, fontWeight: '600' },
  commentBody: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, lineHeight: 21 },
});
