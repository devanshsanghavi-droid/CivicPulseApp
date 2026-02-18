// src/screens/IssueDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput, ActivityIndicator,
  Alert, SafeAreaView
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { storageService } from '../services/storage';
import { Issue, Comment } from '../types';
import { CATEGORIES } from '../constants';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type RouteType = RouteProp<RootStackParamList, 'IssueDetail'>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: '#fee2e2', text: '#b91c1c' },
  acknowledged: { bg: '#fef9c3', text: '#a16207' },
  resolved: { bg: '#dcfce7', text: '#15803d' },
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Photos */}
        {issue.photos.length > 0 && (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {issue.photos.map(photo => (
              <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} />
            ))}
          </ScrollView>
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

          {/* Upvote */}
          <TouchableOpacity
            style={[styles.upvoteBtn, hasUpvoted && styles.upvoteBtnActive]}
            onPress={handleUpvote}
            disabled={!user || upvoting}
            activeOpacity={0.8}
          >
            {upvoting ? (
              <ActivityIndicator size="small" color={hasUpvoted ? '#ffffff' : '#2563eb'} />
            ) : (
              <Ionicons name={hasUpvoted ? "thumbsup" : "thumbsup-outline"} size={18} color={hasUpvoted ? '#ffffff' : '#2563eb'} />
            )}
            <Text style={[styles.upvoteBtnText, hasUpvoted && styles.upvoteBtnTextActive]}>
              {issue.upvoteCount} {issue.upvoteCount === 1 ? 'Upvote' : 'Upvotes'}
            </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#9ca3af', fontWeight: '700' },

  photoScroll: { height: 240 },
  photo: { width: 400, height: 240, resizeMode: 'cover' },

  body: { padding: 20 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  category: { fontSize: 11, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', letterSpacing: 1, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  title: { fontSize: 24, fontWeight: '900', color: '#111827', letterSpacing: -0.5, marginBottom: 12 },
  description: { fontSize: 15, color: '#4b5563', lineHeight: 24, marginBottom: 16 },

  statusNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  statusNoteText: { fontSize: 13, color: '#1d4ed8', flex: 1, lineHeight: 20 },

  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  reporterAvatar: { width: 28, height: 28, borderRadius: 14 },
  reporterAvatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  reporterName: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  reporterDate: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  locationText: { fontSize: 13, color: '#6b7280', flex: 1 },

  upvoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: '#2563eb', borderRadius: 14,
    paddingVertical: 14, justifyContent: 'center', marginBottom: 28,
  },
  upvoteBtnActive: { backgroundColor: '#2563eb' },
  upvoteBtnText: { fontSize: 15, fontWeight: '800', color: '#2563eb' },
  upvoteBtnTextActive: { color: '#ffffff' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 3, marginBottom: 14 },

  commentInputRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'flex-end' },
  commentInput: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827', maxHeight: 100,
  },
  commentSendBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
  },
  commentSendBtnDisabled: { backgroundColor: '#93c5fd' },

  noComments: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 24 },

  commentCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
    padding: 14, marginBottom: 10,
  },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12 },
  commentAvatarPlaceholder: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  commentAuthor: { fontSize: 12, fontWeight: '800', color: '#374151', flex: 1 },
  commentDate: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  commentBody: { fontSize: 14, color: '#4b5563', lineHeight: 21 },
});
