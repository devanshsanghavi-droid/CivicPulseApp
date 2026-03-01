// src/screens/ReportScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../services/firestoreService';
import { CATEGORIES } from '../constants';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

export default function ReportScreen() {
  const { user } = useApp();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => { getLocation(); }, []);

  const getLocation = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Please enable location access to report issues.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      // Reverse geocode
      const geo = await Location.reverseGeocodeAsync(loc.coords);
      if (geo[0]) {
        const g = geo[0];
        setAddress(`${g.streetNumber || ''} ${g.street || ''}, ${g.city || ''}, ${g.region || ''}`);
      }
    } catch (err) {
      console.warn('Location error:', err);
    } finally {
      setLocLoading(false);
    }
  };

  const pickPhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can attach up to 3 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can attach up to 3 photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter a title.');
    if (!description.trim()) return Alert.alert('Required', 'Please enter a description.');
    if (!categoryId) return Alert.alert('Required', 'Please select a category.');
    if (!location) return Alert.alert('Required', 'Location is required to submit a report.');
    if (!user) return;

    setSubmitting(true);
    try {
      // Create issue in Firestore first to get an ID
      const issue = await firestoreService.createIssue({
        createdBy: user.id,
        creatorName: user.name,
        creatorPhotoURL: user.photoURL,
        title: title.trim(),
        description: description.trim(),
        categoryId,
        latitude: location.latitude,
        longitude: location.longitude,
        address,
        photos: [],
      });

      // Upload photos and attach to issue
      const uploadedPhotos = await Promise.all(
        photos.map(async (uri, i) => ({
          id: `photo_${i}`,
          url: await firestoreService.uploadPhoto(uri, issue.id),
        }))
      );

      if (uploadedPhotos.length > 0) {
        await firestoreService.updateIssueStatus(issue.id, 'open');
      }

      Alert.alert('Report Submitted! ✅', 'Your issue has been reported to the city.', [
        { text: 'View Feed', onPress: () => navigation.goBack() }
      ]);

      // Reset form
      setTitle('');
      setDescription('');
      setCategoryId('');
      setPhotos([]);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3].map(step => (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.stepCircle, currentStep === step && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, currentStep === step && styles.stepNumberActive]}>
                  {step}
                </Text>
              </View>
              {step < 3 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
            </View>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add Photos</Text>
              <Text style={styles.stepDescription}>Take photos or select from your library to document the issue.</Text>
              
              <View style={styles.photoGrid}>
                {photos.map((uri, i) => (
                  <View key={i} style={styles.photoThumb}>
                    <Image source={{ uri }} style={styles.photoImg} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 3 && (
                  <>
                    <TouchableOpacity style={styles.photoAddBtn} onPress={takePhoto}>
                      <Ionicons name="camera" size={24} color={COLORS.primary} />
                      <Text style={styles.photoAddText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhoto}>
                      <Ionicons name="image" size={24} color={COLORS.primary} />
                      <Text style={styles.photoAddText}>Library</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Issue Details</Text>
              <Text style={styles.stepDescription}>Provide details about the issue you're reporting.</Text>
              
              <View style={styles.field}>
                <Text style={styles.label}>ISSUE TITLE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Large pothole on Main St"
                  placeholderTextColor={COLORS.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={80}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>CATEGORY</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]}
                      onPress={() => setCategoryId(cat.id)}
                    >
                      <Text style={[styles.categoryText, categoryId === cat.id && styles.categoryTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>DESCRIPTION</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor={COLORS.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Location</Text>
              <Text style={styles.stepDescription}>Confirm the location where this issue occurred.</Text>
              
              <View style={styles.field}>
                <TouchableOpacity style={styles.locationBox} onPress={getLocation}>
                  {locLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Ionicons name={location ? "location" : "location-outline"} size={20} color={location ? COLORS.primary : COLORS.textMuted} />
                  )}
                  <Text style={[styles.locationText, !location && styles.locationPlaceholder]}>
                    {location ? (address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`) : 'Tap to detect location'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {location && (
                <View style={styles.mapPreview}>
                  <Text style={styles.mapPreviewText}>Location detected</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Ionicons name="chevron-back" size={18} color={COLORS.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextBtn, currentStep === 3 && styles.submitBtn]}
            onPress={currentStep === 3 ? handleSubmit : () => setCurrentStep(currentStep + 1)}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name={currentStep === 3 ? "send" : "chevron-forward"} size={18} color="#ffffff" />
                <Text style={styles.nextBtnText}>
                  {currentStep === 3 ? 'SUBMIT REPORT' : 'Next'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: 120 },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
  },
  stepNumber: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.sm,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },

  // Step Content
  stepContent: {
    paddingVertical: SPACING.lg,
  },
  stepTitle: {
    ...TYPOGRAPHY.pageTitle,
    fontSize: 24,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  stepDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },

  // Form Fields
  field: { marginBottom: SPACING.xl },
  label: { ...TYPOGRAPHY.sectionLabel, color: COLORS.textMuted, marginBottom: SPACING.sm },

  input: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body, fontSize: 15, color: COLORS.textPrimary,
  },
  textArea: { minHeight: 100, paddingTop: SPACING.md },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  categoryChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round, backgroundColor: COLORS.cardBackground,
    borderWidth: 1, borderColor: COLORS.border,
  },
  categoryChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textSecondary },
  categoryTextActive: { color: '#ffffff' },

  locationBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  locationText: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, flex: 1 },
  locationPlaceholder: { color: COLORS.textMuted },

  // Photo Grid (2-column layout)
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  photoThumb: { 
    width: '48%', 
    height: 120, 
    borderRadius: BORDER_RADIUS.md, 
    position: 'relative',
    aspectRatio: 1,
  },
  photoImg: { width: '100%', height: '100%', borderRadius: BORDER_RADIUS.md },
  photoRemove: { position: 'absolute', top: -6, right: -6 },
  photoAddBtn: {
    width: '48%', 
    height: 120, 
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight, 
    borderWidth: 2, 
    borderColor: COLORS.primaryBorder,
    borderStyle: 'dashed', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: SPACING.xs,
    aspectRatio: 1,
  },
  photoAddText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.primary },

  // Map Preview
  mapPreview: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  mapPreviewText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Navigation Buttons
  navigationButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SPACING.lg,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    ...SHADOWS.colored(COLORS.primary),
  },
  submitBtn: {
    backgroundColor: COLORS.success,
    ...SHADOWS.colored(COLORS.success),
  },
  nextBtnText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
});
