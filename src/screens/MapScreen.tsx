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
import { Ionicons } from '@expo/vector-icons';
import { firestoreService } from '../services/firestoreService';
import { Issue } from '../types';
import { CATEGORIES } from '../constants';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'Main'>;

// Los Altos default center
const DEFAULT_REGION: Region = {
  latitude: 37.3852,
  longitude: -122.1141,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const STATUS_COLORS: Record<string, string> = {
  open: '#2563eb',
  acknowledged: '#d97706',
  resolved: '#16a34a',
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
        <View style={styles.headerDot} />
        <Text style={styles.headerText}>LIVE GEOSPATIAL FEED</Text>
      </View>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
          <Text style={styles.legendText}>ACTIVE INCIDENT</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
          <Text style={styles.legendText}>RESOLVED STATE</Text>
        </View>
      </View>

      {/* My location button */}
      <TouchableOpacity style={styles.locationBtn} onPress={getUserLocation}>
        <Ionicons name="locate" size={22} color="#2563eb" />
      </TouchableOpacity>

      {/* Report FAB */}
      {user && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('Main')}
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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  headerDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb',
  },
  headerText: { fontSize: 10, fontWeight: '800', color: '#111827', letterSpacing: 2 },

  loadingOverlay: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12, padding: 10,
  },

  legend: {
    position: 'absolute', bottom: 100, left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16, padding: 14, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#ffffff' },
  legendText: { fontSize: 9, fontWeight: '800', color: '#6b7280', letterSpacing: 1.5 },

  locationBtn: {
    position: 'absolute', bottom: 100, right: 16,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },

  fab: {
    position: 'absolute', bottom: 24, right: 16,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    borderWidth: 3, borderColor: '#ffffff',
  },

  callout: { width: 240 },
  calloutInner: { padding: 12 },
  calloutStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  calloutDot: { width: 6, height: 6, borderRadius: 3 },
  calloutStatus: { fontSize: 9, fontWeight: '800', color: '#9ca3af', letterSpacing: 1 },
  calloutCategory: { fontSize: 10, fontWeight: '900', color: '#2563eb', textTransform: 'uppercase', marginBottom: 4 },
  calloutTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  calloutCta: { fontSize: 10, fontWeight: '700', color: '#9ca3af' },
});
