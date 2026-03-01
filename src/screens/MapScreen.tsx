// src/screens/MapScreen.tsx
// Replaces Leaflet with react-native-maps (MapKit on iOS)
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { Issue } from '../types';
import { CATEGORIES } from '../constants';
import { useApp } from '../context/AppContext';
import { RootStackParamList, MainTabParamList } from '../navigation/AppNavigator';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../styles/designSystem';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  StackNavigationProp<RootStackParamList>
>;
type RouteType = RouteProp<RootStackParamList, 'Main'>;

// Los Altos default center
const DEFAULT_REGION: Region = {
  latitude: 37.3852,
  longitude: -122.1141,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const STATUS_COLORS: Record<string, string> = {
  open: COLORS.open,
  acknowledged: COLORS.acknowledged,
  resolved: COLORS.resolved,
};

export default function MapScreen() {
  const { user, locationExplained, setLocationExplained } = useApp();
  const navigation = useNavigation<Nav>();
  const mapRef = useRef<MapView>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);

  useEffect(() => {
    const loadIssues = async () => {
      try {
        const data = await firestoreService.getIssues();
        setIssues(data);
      } catch (err) {
        console.error('Map: failed to load issues', err);
      } finally {
        setLoading(false);
      }
    };
    loadIssues();
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const userRegion: Region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
      setRegion(userRegion);
      mapRef.current?.animateToRegion(userRegion, 800);
    } catch {
      console.warn('Could not get user location');
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {issues.map(issue => {
          const color = STATUS_COLORS[issue.status] || STATUS_COLORS.open;
          const category = CATEGORIES.find(c => c.id === issue.categoryId);
          return (
            <Marker
              key={issue.id}
              coordinate={{ latitude: issue.latitude, longitude: issue.longitude }}
              pinColor={color}
            >
              <Callout
                onPress={() => navigation.navigate('IssueDetail', { issueId: issue.id })}
                style={styles.callout}
              >
                <View style={styles.calloutInner}>
                  <View style={styles.calloutStatusRow}>
                    <View style={[styles.calloutDot, { backgroundColor: color }]} />
                    <Text style={styles.calloutStatus}>{issue.status.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.calloutCategory}>{category?.name}</Text>
                  <Text style={styles.calloutTitle}>{issue.title}</Text>
                  <Text style={styles.calloutCta}>Tap to view full report →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Header pill */}
      <View style={styles.headerPill}>
        <View style={[styles.headerDot, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.headerText}>LIVE GEOSPATIAL FEED</Text>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.open }]} />
          <Text style={styles.legendText}>ACTIVE INCIDENT</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.resolved }]} />
          <Text style={styles.legendText}>RESOLVED STATE</Text>
        </View>
      </View>

      {/* My location button */}
      <TouchableOpacity style={styles.locationBtn} onPress={getUserLocation}>
        <Ionicons name="locate" size={22} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Report FAB */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('Main', { screen: 'Report' })}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  headerPill: {
    position: 'absolute', top: 16,
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BORDER_RADIUS.round, paddingHorizontal: SPACING.lg, paddingVertical: 10,
    ...SHADOWS.medium,
  },
  headerDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  headerText: { ...TYPOGRAPHY.microLabel, color: COLORS.textPrimary },

  loadingOverlay: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm,
  },

  legend: {
    position: 'absolute', bottom: 100, left: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: SPACING.sm,
    ...SHADOWS.subtle,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#ffffff' },
  legendText: { ...TYPOGRAPHY.microLabel, color: COLORS.textSecondary },

  locationBtn: {
    position: 'absolute', bottom: 100, right: SPACING.lg,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.cardBackground, alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.subtle,
  },

  fab: {
    position: 'absolute', bottom: SPACING.xxl, right: SPACING.lg,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.colored(COLORS.primary),
    borderWidth: 3, borderColor: '#ffffff',
  },

  callout: { width: 240 },
  calloutInner: { padding: SPACING.md },
  calloutStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  calloutDot: { width: 6, height: 6, borderRadius: 3 },
  calloutStatus: { ...TYPOGRAPHY.microLabel, color: COLORS.textMuted, letterSpacing: 1 },
  calloutCategory: { ...TYPOGRAPHY.caption, color: COLORS.primary, textTransform: 'uppercase', marginBottom: 4 },
  calloutTitle: { ...TYPOGRAPHY.body, fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  calloutCta: { ...TYPOGRAPHY.caption, fontWeight: '700', color: COLORS.textMuted },
});
