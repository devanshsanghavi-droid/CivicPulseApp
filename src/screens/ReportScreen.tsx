// src/screens/ReportScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../services/firestoreService';
import { CATEGORIES } from '../constants';
import { useNavigation } from '@react-navigation/native';

export default function ReportScreen() {
  const { user } = useApp();
  const navigation = useNavigation();
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>File a Report</Text>
        <Text style={styles.subheading}>REPORT A CITY ISSUE</Text>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>ISSUE TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Large pothole on Main St"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
        </View>

        {/* Category */}
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

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the issue in detail..."
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Location */}
        <View style={styles.field}>
          <Text style={styles.label}>LOCATION</Text>
          <TouchableOpacity style={styles.locationBox} onPress={getLocation}>
            {locLoading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons name={location ? "location" : "location-outline"} size={18} color={location ? "#2563eb" : "#9ca3af"} />
            )}
            <Text style={[styles.locationText, !location && styles.locationPlaceholder]}>
              {location ? (address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`) : 'Tap to detect location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photos */}
        <View style={styles.field}>
          <Text style={styles.label}>PHOTOS (OPTIONAL)</Text>
          <View style={styles.photoRow}>
            {photos.map((uri, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImg} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 3 && (
              <View style={styles.photoAddRow}>
                <TouchableOpacity style={styles.photoAddBtn} onPress={takePhoto}>
                  <Ionicons name="camera" size={22} color="#2563eb" />
                  <Text style={styles.photoAddText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoAddBtn} onPress={pickPhoto}>
                  <Ionicons name="image" size={22} color="#2563eb" />
                  <Text style={styles.photoAddText}>Library</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#ffffff" />
              <Text style={styles.submitBtnText}>SUBMIT REPORT</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 48 },

  heading: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -1, marginBottom: 2 },
  subheading: { fontSize: 10, fontWeight: '800', color: '#2563eb', letterSpacing: 3, marginBottom: 24 },

  field: { marginBottom: 24 },
  label: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 2, marginBottom: 8 },

  input: {
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#111827',
  },
  textArea: { minHeight: 100, paddingTop: 14 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 100, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  categoryChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  categoryTextActive: { color: '#ffffff' },

  locationBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  locationText: { fontSize: 14, color: '#111827', flex: 1 },
  locationPlaceholder: { color: '#9ca3af' },

  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoThumb: { width: 90, height: 90, borderRadius: 12, position: 'relative' },
  photoImg: { width: '100%', height: '100%', borderRadius: 12 },
  photoRemove: { position: 'absolute', top: -6, right: -6 },
  photoAddRow: { flexDirection: 'row', gap: 10 },
  photoAddBtn: {
    width: 90, height: 90, borderRadius: 12,
    backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoAddText: { fontSize: 10, fontWeight: '700', color: '#2563eb' },

  submitBtn: {
    backgroundColor: '#2563eb', borderRadius: 16,
    paddingVertical: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#2563eb', shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
});
