import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

const ProfileScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await authService.getProfile(token);
      const user = res?.user;
      setName(user?.name || '');
      setEmail(user?.email || '');
      setWalletAddress(user?.walletAddress || '');
    } catch (error) {
      console.error('Profile load error:', error.message);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Validation', 'Name and email are required.');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      const res = await authService.updateProfile(token, {
        name: name.trim(),
        email: email.trim(),
        walletAddress: walletAddress.trim(),
      });
      const updated = res?.user;
      await AsyncStorage.setItem('user', JSON.stringify(updated));
      setWalletAddress(updated?.walletAddress || '');
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile save error:', error.message);
      const msg = error?.response?.data?.message || error.message || 'Failed to save profile';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0d1f0d', '#0f2a0f']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>View and update your account details.</Text>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Account</Text>
            {loading ? (
              <ActivityIndicator color="#4dff4d" style={{ marginVertical: 16 }} />
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{name || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email || '—'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Wallet</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{walletAddress || 'Not added'}</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Wallet Address (Solana/Ethereum)"
              placeholderTextColor="#9CA3AF"
              value={walletAddress}
              onChangeText={setWalletAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingTop: 8 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#aaaaaa', marginBottom: 20 },
  card: {
    backgroundColor: '#1a2e1a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a3e2a',
  },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { color: '#aaaaaa', fontSize: 14 },
  infoValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', maxWidth: '70%' },
  input: {
    backgroundColor: '#142514',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#4dff4d',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: '800' },
});

export default ProfileScreen;