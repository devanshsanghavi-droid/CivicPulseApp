// src/screens/LocationExplanationScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type Nav = StackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<RootStackParamList, 'LocationExplanation'>;

export default function LocationExplanationScreen() {
  const { setLocationExplained } = useApp();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteType>();

  const handleConfirm = () => {
    setLocationExplained(true);
    navigation.goBack();
  };

  const handleCancel = () => {
    setLocationExplained(true);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="location" size={48} color="#2563eb" />
        </View>

        <Text style={styles.title}>Geospatial Awareness</Text>
        <Text style={styles.subtitle}>
          To effectively coordinate with city maintenance crews, we require access to your device's location.
        </Text>

        {/* Reasons */}
        <View style={styles.reasons}>
          <View style={styles.reasonCard}>
            <View style={styles.reasonNum}>
              <Text style={styles.reasonNumText}>01</Text>
            </View>
            <View style={styles.reasonContent}>
              <Text style={styles.reasonTitle}>PINPOINT ACCURACY</Text>
              <Text style={styles.reasonDesc}>Ensures city crews find the exact pothole or streetlight without guesswork.</Text>
            </View>
          </View>
          <View style={styles.reasonCard}>
            <View style={styles.reasonNum}>
              <Text style={styles.reasonNumText}>02</Text>
            </View>
            <View style={styles.reasonContent}>
              <Text style={styles.reasonTitle}>CONTEXTUAL FEED</Text>
              <Text style={styles.reasonDesc}>Prioritizes reports in your immediate vicinity on your activity feed.</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>ENABLE LOCATION SERVICES</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>PROCEED WITHOUT LOCATION</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  iconWrap: {
    width: 96, height: 96,
    backgroundColor: '#eff6ff',
    borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#dbeafe', marginBottom: 28,
  },

  title: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: -0.5, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  reasons: { width: '100%', gap: 12, marginBottom: 36 },
  reasonCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6', padding: 16,
  },
  reasonNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  reasonNumText: { fontSize: 10, fontWeight: '900', color: '#2563eb' },
  reasonContent: { flex: 1 },
  reasonTitle: { fontSize: 11, fontWeight: '900', color: '#111827', letterSpacing: 1, marginBottom: 4 },
  reasonDesc: { fontSize: 12, color: '#6b7280', lineHeight: 18 },

  confirmBtn: {
    width: '100%', backgroundColor: '#2563eb', borderRadius: 18,
    paddingVertical: 18, alignItems: 'center', marginBottom: 14,
    shadowColor: '#2563eb', shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  confirmBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 2 },

  cancelBtn: { paddingVertical: 8 },
  cancelBtnText: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 2 },
});
