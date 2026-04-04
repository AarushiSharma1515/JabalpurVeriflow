import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE } from '../services/projectsService';

export default function AdminDashboard({ navigation }) {
  const [token, setToken] = useState(null);
  const [counts, setCounts] = useState({
    admin_review: 0,
    manual_review: 0,
    appealed: 0,
  });

  useEffect(() => {
    const init = async () => {
      const savedToken = await AsyncStorage.getItem("token");
      setToken(savedToken);
      if (savedToken) fetchCounts(savedToken);
    };
    init();
  }, []);

  const fetchCounts = async (t) => {
    try {
      const [r1, r2, r3] = await Promise.all([
        axios.get(`${API_BASE}/api/ml/results?status=admin_review&limit=1`, { headers: { Authorization: `Bearer ${t}` } }),
        axios.get(`${API_BASE}/api/ml/results?status=manual_review&limit=1`, { headers: { Authorization: `Bearer ${t}` } }),
        axios.get(`${API_BASE}/api/ml/results?status=appealed&limit=1`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      setCounts({
        admin_review: r1.data.total || 0,
        manual_review: r2.data.total || 0,
        appealed: r3.data.total || 0,
      });
    } catch (e) {
      console.log('Count fetch error:', e.message);
    }
  };

  const dashboardItems = [
    { title: "All Users", desc: "Farmers, buyers, sellers & marketplace users", icon: "people", screen: "ManageFarmers", color: "#3b82f6" },
    { title: "Manage Plots", desc: "Review plot registrations & verify status", icon: "leaf", screen: "ManagePlots", color: "#10b981" },
    { title: "Carbon Reports", desc: "View MRV stats & credit calculations", icon: "analytics", screen: "CarbonReportsScreen", color: "#f59e0b" },
    { title: "Marketplace", desc: "Monitor marketplace transactions & users", icon: "cart", screen: "Marketplace", color: "#ec4899" },
  ];

  const Badge = ({ count, color }) => count > 0 ? (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  ) : null;

  return (
    <LinearGradient colors={['#0d1f0d', '#0f2a0f']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Review & Verify Results</Text>
          </View>

          {/* ML Review Queue */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review Queue</Text>

            <TouchableOpacity style={styles.reviewCard} onPress={() => navigation.navigate('MLReviewScreen', { token, filterStatus: 'admin_review' })} activeOpacity={0.8}>
              <View style={styles.reviewRow}>
                <View style={[styles.tierDot, { backgroundColor: '#f59e0b' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewTitle}>Admin Review (50–74%)</Text>
                  <Text style={styles.reviewDesc}>Approve to auto-mint credits</Text>
                </View>
                <Badge count={counts.admin_review} color="#f59e0b" />
                <Ionicons name="chevron-forward" size={20} color="#a1a1a1" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.reviewCard} onPress={() => navigation.navigate('MLReviewScreen', { token, filterStatus: 'manual_review' })} activeOpacity={0.8}>
              <View style={styles.reviewRow}>
                <View style={[styles.tierDot, { backgroundColor: '#ef4444' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewTitle}>Manual Review (35–49%)</Text>
                  <Text style={styles.reviewDesc}>Requires notes before approval</Text>
                </View>
                <Badge count={counts.manual_review} color="#ef4444" />
                <Ionicons name="chevron-forward" size={20} color="#a1a1a1" />
              </View>
            </TouchableOpacity>

            {counts.appealed > 0 && (
              <TouchableOpacity style={styles.reviewCard} onPress={() => navigation.navigate('MLReviewScreen', { token, filterStatus: 'appealed' })} activeOpacity={0.8}>
                <View style={styles.reviewRow}>
                  <View style={[styles.tierDot, { backgroundColor: '#8b5cf6' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewTitle}>Appeals</Text>
                    <Text style={styles.reviewDesc}>Farmer appeals for denied results</Text>
                  </View>
                  <Badge count={counts.appealed} color="#8b5cf6" />
                  <Ionicons name="chevron-forward" size={20} color="#a1a1a1" />
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Standard Dashboard Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage</Text>
            {dashboardItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.rowCard} activeOpacity={0.8} onPress={() => navigation.navigate(item.screen, { token })}>
                <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={24} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#4dff4d" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={[styles.rowCard, styles.logoutRow]} onPress={() => navigation.replace("Login")} activeOpacity={0.8}>
              <View style={[styles.iconCircle, { backgroundColor: '#ff6b6b' }]}>
                <Ionicons name="log-out" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: '#ff6b6b' }]}>Logout</Text>
                <Text style={styles.rowDesc}>Sign out of admin account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ff6b6b" />
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingVertical: 20, paddingBottom: 60, paddingHorizontal: 20 },
  header: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4dff4d', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a1a1a1', opacity: 0.9 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#4dff4d', marginBottom: 14 },
  reviewCard: {
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#2d5a2d',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 4,
  },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierDot: { width: 12, height: 12, borderRadius: 6 },
  reviewTitle: { fontSize: 16, fontWeight: '700', color: '#e5e5e5' },
  reviewDesc: { fontSize: 13, color: '#a1a1a1', marginTop: 2 },
  badge: {
    minWidth: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6, marginRight: 8,
  },
  badgeText: { color: '#0d1f0d', fontSize: 12, fontWeight: '700' },
  rowCard: {
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#2d5a2d',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    elevation: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#e5e5e5' },
  rowDesc: { fontSize: 13, color: '#a1a1a1', marginTop: 2 },
  logoutRow: { borderColor: '#5f3c3c', backgroundColor: '#3a2020' },
});