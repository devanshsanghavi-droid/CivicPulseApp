// src/screens/ReportScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert, ActivityIndicator, SafeAreaView,
  KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useApp } from '../context/AppContext';
import { firestoreService } from '../services/firestoreService';
import { CATEGORIES } from '../constants';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LocationTab = 'gps' | 'address' | 'pin';
const STEP_LABELS = ['Photos', 'Details', 'Location'];

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

  // Location tab state
  const [locationTab, setLocationTab] = useState<LocationTab>('gps');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSearching, setAddressSearching] = useState(false);
  const [pinLocation, setPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinAddress, setPinAddress] = useState('');
  const [addressResult, setAddressResult] = useState<{ lat: number; lng: number; display: string } | null>(null);

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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const remaining = 3 - photos.length;
      const newUris = result.assets.slice(0, remaining).map(a => a.uri);
      setPhotos(prev => [...prev, ...newUris]);
    }
  };

  const takePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert('Limit Reached', 'You can attach up to 3 photos.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  // Address search via Nominatim
  const searchAddress = async () => {
    if (!addressQuery.trim()) return;
    setAddressSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const parsed = { lat: parseFloat(lat), lng: parseFloat(lon), display: display_name };
        setAddressResult(parsed);
        setLocation({ latitude: parsed.lat, longitude: parsed.lng });
        setAddress(parsed.display);
      } else {
        Alert.alert('Not Found', 'No results found for that address.');
      }
    } catch {
      Alert.alert('Error', 'Failed to search address.');
    } finally {
      setAddressSearching(false);
    }
  };

  // Pin drop: reverse geocode
  const handlePinDrop = async (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPinLocation({ latitude, longitude });
    setLocation({ latitude, longitude });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const data = await res.json();
      if (data.display_name) {
        setPinAddress(data.display_name);
        setAddress(data.display_name);
      }
    } catch {
      setPinAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  };

  // Get the effective location based on tab
  const getEffectiveLocation = () => {
    switch (locationTab) {
      case 'gps': return location;
      case 'address': return addressResult ? { latitude: addressResult.lat, longitude: addressResult.lng } : null;
      case 'pin': return pinLocation;
    }
  };

  const getEffectiveAddress = () => {
    switch (locationTab) {
      case 'gps': return address;
      case 'address': return addressResult?.display || '';
      case 'pin': return pinAddress;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter a title.');
    if (!description.trim()) return Alert.alert('Required', 'Please enter a description.');
    if (!categoryId) return Alert.alert('Required', 'Please select a category.');
    const effectiveLoc = getEffectiveLocation();
    if (!effectiveLoc) return Alert.alert('Required', 'Location is required to submit a report.');
    if (!user) return;

    setSubmitting(true);
    try {
      const issue = await firestoreService.createIssue({
        createdBy: user.id,
        creatorName: user.name,
        creatorPhotoURL: user.photoURL,
        title: title.trim(),
        description: description.trim(),
        categoryId,
        latitude: effectiveLoc.latitude,
        longitude: effectiveLoc.longitude,
        address: getEffectiveAddress(),
        photos: [],
      });

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
      setCurrentStep(1);
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step, idx) => (
        <React.Fragment key={step}>
          <View style={styles.stepColumn}>
            <View style={[
              styles.stepCircle,
              currentStep === step && styles.stepCircleActive,
              currentStep > step && styles.stepCircleCompleted,
              currentStep < step && styles.stepCircleInactive,
            ]}>
              {currentStep > step ? (
                <Ionicons name="checkmark" size={18} color="#ffffff" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  currentStep === step && styles.stepNumberActive,
                  currentStep < step && styles.stepNumberInactive,
                ]}>
                  {step}
                </Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              currentStep === step && styles.stepLabelActive,
            ]}>
              {STEP_LABELS[idx]}
            </Text>
          </View>
          {step < 3 && (
            <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {renderStepIndicator()}

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
              <Text style={styles.stepDescription}>Choose how to set the issue location.</Text>

              {/* Location Tab Selector */}
              <View style={styles.locTabs}>
                {([
                  { key: 'gps' as LocationTab, label: 'My Location', icon: 'navigate' as const },
                  { key: 'address' as LocationTab, label: 'Address', icon: 'search' as const },
                  { key: 'pin' as LocationTab, label: 'Pin Drop', icon: 'pin' as const },
                ]).map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.locTab, locationTab === t.key && styles.locTabActive]}
                    onPress={() => setLocationTab(t.key)}
                  >
                    <Ionicons name={t.icon} size={14} color={locationTab === t.key ? COLORS.primary : COLORS.textMuted} />
                    <Text style={[styles.locTabText, locationTab === t.key && styles.locTabTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* GPS Tab */}
              {locationTab === 'gps' && (
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
                  {location && (
                    <MapView
                      style={styles.locMapPreview}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                      region={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                    >
                      <Marker coordinate={location} pinColor={COLORS.primary} />
                    </MapView>
                  )}
                </View>
              )}

              {/* Address Search Tab */}
              {locationTab === 'address' && (
                <View style={styles.field}>
                  <View style={styles.addressRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Enter an address..."
                      placeholderTextColor={COLORS.textMuted}
                      value={addressQuery}
                      onChangeText={setAddressQuery}
                      onSubmitEditing={searchAddress}
                      returnKeyType="search"
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={searchAddress} disabled={addressSearching}>
                      {addressSearching
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="search" size={18} color="#fff" />
                      }
                    </TouchableOpacity>
                  </View>
                  {addressResult && (
                    <>
                      <Text style={styles.resolvedAddress}>{addressResult.display}</Text>
                      <MapView
                        style={styles.locMapPreview}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        rotateEnabled={false}
                        pitchEnabled={false}
                        region={{
                          latitude: addressResult.lat,
                          longitude: addressResult.lng,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }}
                      >
                        <Marker coordinate={{ latitude: addressResult.lat, longitude: addressResult.lng }} pinColor={COLORS.primary} />
                      </MapView>
                    </>
                  )}
                </View>
              )}

              {/* Pin Drop Tab */}
              {locationTab === 'pin' && (
                <View style={styles.field}>
                  <Text style={styles.pinHint}>Tap anywhere on the map to place a pin</Text>
                  <MapView
                    style={styles.locMapInteractive}
                    onPress={handlePinDrop}
                    initialRegion={{
                      latitude: location?.latitude || 37.3861,
                      longitude: location?.longitude || -122.0839,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                  >
                    {pinLocation && (
                      <Marker
                        coordinate={pinLocation}
                        draggable
                        onDragEnd={(e) => handlePinDrop(e as any)}
                        pinColor={COLORS.primary}
                      />
                    )}
                  </MapView>
                  {pinAddress ? (
                    <Text style={styles.resolvedAddress}>{pinAddress}</Text>
                  ) : null}
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

  // Step Indicator — redesigned
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepColumn: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    ...SHADOWS.colored(COLORS.primary),
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.primary,
  },
  stepCircleInactive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  stepNumberActive: {
    color: '#ffffff',
    fontSize: 16,
  },
  stepNumberInactive: {
    color: '#9ca3af',
  },
  stepLabel: {
    ...TYPOGRAPHY.microLabel,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#d1d5db',
    marginTop: 18,
    marginHorizontal: SPACING.xs,
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
    textAlign: 'center',
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

  // Location tabs
  locTabs: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  locTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locTabActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
  },
  locTabText: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted },
  locTabTextActive: { color: COLORS.primary },

  locationBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  locationText: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, flex: 1 },
  locationPlaceholder: { color: COLORS.textMuted },

  locMapPreview: {
    width: '100%',
    height: 180,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  locMapInteractive: {
    width: '100%',
    height: 280,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  addressRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolvedAddress: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  pinHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

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
