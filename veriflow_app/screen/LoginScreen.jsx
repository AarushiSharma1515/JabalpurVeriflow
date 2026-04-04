import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/authService';
import Checkbox from "expo-checkbox";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  // SAMPLE ADMIN CREDENTIALS
  const ADMIN_EMAIL = "admin@veriflow.com";
  const ADMIN_PASSWORD = "admin123";

  const handleLogin = async () => {
    setError(null);

    if (!email || !password) {
      setError("Please fill all fields");
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    // -------------------- ADMIN LOGIN --------------------
    if (isAdmin) {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        await AsyncStorage.setItem("role", "admin");
        // Store a mock token for admin (since admin is hardcoded and doesn't use backend auth)
        await AsyncStorage.setItem("token", "admin-mock-token");
        Alert.alert("Admin Login", "Welcome Admin!");
        navigation.replace("AdminDashboard");
        return;
      } else {
        Alert.alert("Invalid Admin Credentials", "Try again.");
        return;
      }
    }

    // ------------------ NORMAL USER LOGIN ------------------
    setLoading(true);

    try {
      const resp = await authService.login(email, password);
      const { token, user } = resp;

      if (!token) throw new Error("No token from backend");
      if (!user?.role) throw new Error("User has no role");

      await AsyncStorage.setItem("token", token);
      await AsyncStorage.setItem("role", user.role);
      await AsyncStorage.setItem("user", JSON.stringify(user)); // <-- CRITICAL

      Alert.alert("Success", `Welcome ${user.email}`);

      // ROLE-BASED NAVIGATION
      if (user.role === "farmer") {
        navigation.replace("FarmerDashboard");
      } else if (user.role === "marketplaceuser") {
        navigation.replace("Marketplace");
      } else {
        Alert.alert("Error", "Unknown role: " + user.role);
      }

    } catch (err) {
      const msg = err?.response?.data?.message ?? err.message ?? "Login failed";
      setError(msg);
      Alert.alert("Login Failed", msg);
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
        <View style={styles.content}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Blue Carbon Registry</Text>
            <Text style={styles.subtitle}>Field Data Collection</Text>
          </View>

          <View style={styles.form}>
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
              placeholder="Password"
              placeholderTextColor="#aaaaaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* ----------- ADMIN CHECKBOX ----------- */}
            <View style={styles.checkboxContainer}>
              <Checkbox value={isAdmin} onValueChange={setIsAdmin} />
              <Text style={styles.checkboxLabel}>I am Admin</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? "Loading..." : "Login"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.link}>Don't have an account? Register</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaaaaa',
    opacity: 0.95,
    textAlign: 'center',
  },
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

  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginLeft: 4,
  },

  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: "#aaaaaa",
  },

  button: {
    backgroundColor: '#4dff4d',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    elevation: 8,
  },

  buttonDisabled: { opacity: 0.6 },

  buttonText: {
    color: '#0d1f0d',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  link: {
    textAlign: 'center',
    marginTop: 20,
    color: '#4dff4d',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LoginScreen;