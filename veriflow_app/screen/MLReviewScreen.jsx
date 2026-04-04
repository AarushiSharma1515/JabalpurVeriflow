import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE } from '../services/projectsService';

const { width } = Dimensions.get('window');

const TIER_CONFIG = {
  auto_minted:   { color: '#10b981', label: 'Auto-Minted',   icon: 'checkmark-circle' },
  admin_review:  { color: '#f59e0b', label: 'Admin Review',  icon: 'time' },
  manual_review: { color: '#ef4444', label: 'Manual Review', icon: 'warning' },
  auto_denied:   { color: '#6b7280', label: 'Denied',        icon: 'close-circle' },
  appealed:      { color: '#8b5cf6', label: 'Appeal',        icon: 'megaphone' },
  appeal_rejected: { color: '#374151', label: 'Appeal Rejected', icon: 'ban' },
};

export default function MLReviewScreen({ route, navigation }) {
  const { token, filterStatus } = route.params || {};
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const url = filterStatus
        ? `${API_BASE}/api/ml/results?status=${filterStatus}&limit=50`
        : `${API_BASE}/api/ml/results?limit=50`;
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setResults(res.data.results || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const openReview = (result) => {
    setSelectedResult(result);
    setAdminNotes('');
    setModalVisible(true);
  };

  const handleApprove = async () => {
    if (selectedResult.status === 'manual_review' && !adminNotes.trim()) {
      Alert.alert('Notes Required', 'Manual review requires admin notes before approval.');
      return;
    }
    setProcessing(true);
    try {
      const endpoint = selectedResult.status === 'appealed'
        ? `${API_BASE}/api/ml/${selectedResult._id}/appeal/review`
        : `${API_BASE}/api/ml/${selectedResult._id}/approve`;

      const payload = selectedResult.status === 'appealed'
        ? { decision: 'approve', adminNotes }
        : { adminNotes };

      await axios.patch(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Approved', 'Credits will be minted to marketplace.');
      setModalVisible(false);
      fetchResults();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Approval failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      Alert.alert('Notes Required', 'Please provide rejection reason.');
      return;
    }
    setProcessing(true);
    try {
      const endpoint = selectedResult.status === 'appealed'
        ? `${API_BASE}/api/ml/${selectedResult._id}/appeal/review`
        : `${API_BASE}/api/ml/${selectedResult._id}/reject`;

      const payload = selectedResult.status === 'appealed'
        ? { decision: 'reject', adminNotes }
        : { adminNotes };

      await axios.patch(endpoint, payload, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Rejected', 'Result has been rejected.');
      setModalVisible(false);
      fetchResults();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  const titles = {
    admin_review:  'Admin Review Queue',
    manual_review: 'Manual Review Queue',
    appealed:      'Appeals Queue',
  };

  return (
    <LinearGradient colors={['#4A90E2', '#7B68EE']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>{titles[filterStatus] || 'ML Review'}</Text>
            <View style={{ width: 40 }} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 40 }} />
          ) : results.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={64} color="#fff" />
              <Text style={styles.emptyText}>No results pending</Text>
            </View>
          ) : (
            results.map((result) => {
              const cfg = TIER_CONFIG[result.status] || TIER_CONFIG.admin_review;
              const conf = ((result.confidenceScore || result.modelR2Mean || 0) * 100).toFixed(1);
              return (
                <View key={result._id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.tierBadge, { backgroundColor: cfg.color }]}>
                      <Ionicons name={cfg.icon} size={14} color="#fff" />
                      <Text style={styles.tierText}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.conf}>{conf}% confidence</Text>
                  </View>

                  <Text style={styles.projectName}>{result.projectTitle}</Text>
                  <Text style={styles.farmerName}>Farmer: {result.farmerName}</Text>

                  <View style={styles.statsRow}>
                    <Stat label="CO₂" value={`${result.co2TPerHa?.toFixed(1)} t/ha`} />
                    <Stat label="Credits" value={result.credits || Math.floor(result.co2TPerHa || 0)} />
                    <Stat label="Area" value={`${result.areaHectares} ha`} />
                  </View>

                  {result.status === 'appealed' && (
                    <View style={styles.appealBox}>
                      <Text style={styles.appealLabel}>Appeal Reason:</Text>
                      <Text style={styles.appealText}>{result.appealReason}</Text>
                    </View>
                  )}

                  <TouchableOpacity style={styles.reviewBtn} onPress={() => openReview(result)}>
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Review Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Result</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#475569" />
              </TouchableOpacity>
            </View>

            {selectedResult && (
              <>
                <Text style={styles.modalProject}>{selectedResult.projectTitle}</Text>
                <Text style={styles.modalFarmer}>Farmer: {selectedResult.farmerName}</Text>

                <View style={styles.modalStats}>
                  <Text style={styles.modalStat}>CO₂: {selectedResult.co2TPerHa?.toFixed(2)} t/ha</Text>
                  <Text style={styles.modalStat}>Credits: {selectedResult.credits || Math.floor(selectedResult.co2TPerHa || 0)}</Text>
                  <Text style={styles.modalStat}>Confidence: {((selectedResult.confidenceScore || selectedResult.modelR2Mean || 0) * 100).toFixed(1)}%</Text>
                  <Text style={styles.modalStat}>Height: {selectedResult.meanHeightM?.toFixed(1)} m</Text>
                  <Text style={styles.modalStat}>AGB: {selectedResult.meanAgbMgPerHa?.toFixed(1)} Mg/ha</Text>
                </View>

                {selectedResult.status === 'appealed' && (
                  <View style={styles.appealBox}>
                    <Text style={styles.appealLabel}>Appeal Reason:</Text>
                    <Text style={styles.appealText}>{selectedResult.appealReason}</Text>
                  </View>
                )}

                <Text style={styles.notesLabel}>
                  Admin Notes {selectedResult.status === 'manual_review' ? '(required)' : '(optional)'}:
                </Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes..."
                  placeholderTextColor="#94a3b8"
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.rejectBtn, processing && { opacity: 0.6 }]}
                    onPress={handleReject}
                    disabled={processing}
                  >
                    {processing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Reject</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveBtn, processing && { opacity: 0.6 }]}
                    onPress={handleApprove}
                    disabled={processing}
                  >
                    {processing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.actionText}>Approve & Mint</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const Stat = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#fff', fontSize: 18, marginTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, elevation: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tierText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  conf: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  projectName: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  farmerName: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#94a3b8' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  appealBox: { backgroundColor: '#f5f3ff', borderRadius: 8, padding: 10, marginBottom: 12 },
  appealLabel: { fontSize: 12, fontWeight: '700', color: '#7c3aed', marginBottom: 4 },
  appealText: { fontSize: 13, color: '#4c1d95' },
  reviewBtn: { backgroundColor: '#4A90E2', padding: 12, borderRadius: 10, alignItems: 'center' },
  reviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 20, width: width * 0.9, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalProject: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  modalFarmer: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  modalStats: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 14 },
  modalStat: { fontSize: 13, color: '#475569', marginBottom: 4 },
  notesLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  notesInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 14, color: '#1e293b', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, backgroundColor: '#ef4444', padding: 14, borderRadius: 12, alignItems: 'center' },
  approveBtn: { flex: 1, backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});