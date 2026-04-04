import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverMessage, setServerMessage] = useState(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Role options
  const roleOptions = [
    { label: 'Field Operator', value: 'farmer' },
    { label: 'Marketplace User', value: 'marketplaceuser' },
  ];

  const handleRegister = async () => {
    setError(null);

    if (!email || !password) {
      setError('Email and password are required');
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (!role) {
      setError('Please select a role');
      Alert.alert('Error', 'Please select a role');
      return;
    }

    setLoading(true);

    try {
      const payload = { name, email, password, phone, role };
      const resp = await authService.register(payload);

      const { token, user } = resp;
      setServerMessage('Registration successful');

      if (!token) throw new Error('No token returned from server');

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('role', role);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      Alert.alert('Registered', `Welcome ${user?.name ?? user?.email ?? ''}`);

      // Navigate based on role
      if (role === 'marketplaceuser') {
        navigation.replace('Marketplace');
      } else if (role === 'farmer') {
        navigation.replace('FarmerDashboard');
      } else {
        navigation.replace('Login');
      }

      return user;

    } catch (err) {
      const respMsg = err?.response?.data?.message;
      if (respMsg) setServerMessage(respMsg);

      const msg = respMsg ?? err.message ?? 'Registration failed';
      setError(msg);
      Alert.alert('Registration failed', msg);

    } finally {
      setLoading(false);
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join Blue Carbon Registry</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="#aaaaaa"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#aaaaaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor="#aaaaaa"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aaaaaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Role Dropdown */}
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowRoleDropdown(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownButtonText, !role && styles.placeholderText]}>
                  {role ? roleOptions.find(opt => opt.value === role)?.label : 'Select Role'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* Modal */}
              <Modal
                visible={showRoleDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRoleDropdown(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowRoleDropdown(false)}
                >
                  <View style={styles.dropdownModal}>
                    <Text style={styles.dropdownTitle}>Select Your Role</Text>

                    {roleOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.dropdownOption,
                          role === option.value && styles.selectedOption,
                        ]}
                        onPress={() => {
                          setRole(option.value);
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            role === option.value && styles.selectedOptionText,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              {serverMessage ? <Text style={styles.serverMessage}>{serverMessage}</Text> : null}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Register'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.link}>Already have an account? Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaaaaa', opacity: 0.95 },
  form: { width: '100%' },

  input: {
    backgroundColor: '#1a2e1a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a3e2a',
  },

  dropdownButton: {
    backgroundColor: '#1a2e1a',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2a3e2a',
  },
  dropdownButtonText: { fontSize: 16, color: '#FFFFFF' },
  placeholderText: { color: '#aaaaaa' },
  dropdownArrow: { fontSize: 12, color: '#aaaaaa' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownModal: {
    backgroundColor: '#0d1f0d',
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
    paddingVertical: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#2a3e2a',
  },

  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },

  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3e2a',
  },

  selectedOption: { backgroundColor: '#1a2e1a' },
  dropdownOptionText: { fontSize: 16, color: '#FFFFFF' },
  selectedOptionText: { color: '#4dff4d', fontWeight: '600' },

  button: {
    backgroundColor: '#4dff4d',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#0d1f0d', fontSize: 18, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 20, color: '#4dff4d', fontSize: 15 },
  serverMessage: { textAlign: 'center', marginBottom: 8, color: '#4dff4d', fontSize: 14 },
});

export default RegisterScreen;