// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   SafeAreaView,
// } from "react-native";
// import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
// import AsyncStorage from '@react-native-async-storage/async-storage';

// export default function AdminDashboard({ navigation }) {
//   const [token, setToken] = useState(null);

//   useEffect(() => {
//     // Get token from AsyncStorage for API calls
//     const getToken = async () => {
//       const savedToken = await AsyncStorage.getItem("token");
//       setToken(savedToken);
//     };
//     getToken();
//   }, []);
//   const dashboardItems = [
//     { title: "Manage Farmers", desc: "View, edit & approve farmer accounts", icon: "people", screen: "ManageFarmers" },
//     { title: "Manage Plots", desc: "Review plot registrations & status", icon: "leaf", screen: "ManagePlots" },
//     { title: "ML Verification", desc: "Run ML analysis & verify carbon credits", icon: "analytics-outline", screen: "Verification" },
//     { title: "Carbon Credit Reports", desc: "View MRV stats & credit calculations", icon: "analytics", screen: "CarbonReportsScreen" },
//     { title: "Marketplace Users", desc: "Verify buyers/sellers & transactions", icon: "cart", screen: "MarketplaceUsers" },
//     { title: "System Settings", desc: "App configurations & permissions", icon: "settings", screen: "SystemSettings" },
//   ];

//   return (
//     <LinearGradient
//       colors={['#4A90E2', '#7B68EE']}
//       style={styles.gradient}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 1, y: 1 }}
//     >
//       <SafeAreaView style={styles.container}>
//         <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
//           {/* Header */}
//           <View style={styles.header}>
//             <Text style={styles.title}>Admin Dashboard</Text>
//             <Text style={styles.subtitle}>Welcome Admin</Text>
//           </View>

//           {/* Dashboard Cards */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Manage System</Text>

//             {dashboardItems.map((item, index) => (
//               <TouchableOpacity
//                 key={index}
//                 style={styles.card}
//                 activeOpacity={0.8}
//                 onPress={() => navigation.navigate(item.screen, { token })} // Navigate with token
//               >
//                 <View style={styles.cardHeader}>
//                   <Ionicons name={item.icon} size={32} color="#5A7FE2" />
//                 </View>
//                 <Text style={styles.cardTitle}>{item.title}</Text>
//                 <Text style={styles.cardDesc}>{item.desc}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>

//           {/* Logout */}
//           <View style={styles.section}>
//             <TouchableOpacity
//               style={[styles.card, styles.logoutCard]}
//               onPress={() => navigation.replace("Login")}
//               activeOpacity={0.8}
//             >
//               <View style={styles.cardHeader}>
//                 <Ionicons name="log-out" size={32} color="#dc2626" />
//               </View>
//               <Text style={[styles.cardTitle, styles.logoutText]}>Logout</Text>
//               <Text style={styles.cardDesc}>Sign out of admin account</Text>
//             </TouchableOpacity>
//           </View>

//         </ScrollView>
//       </SafeAreaView>
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   gradient: { flex: 1 },
//   container: { flex: 1 },
//   scrollContent: { paddingVertical: 20, paddingBottom: 60, paddingHorizontal: 20 },
//   header: { paddingHorizontal: 20, marginBottom: 24, alignItems: 'center' },
//   title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
//   subtitle: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
//   section: { marginBottom: 25 },
//   sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
//   card: {
//     backgroundColor: '#FFFFFF',
//     padding: 18,
//     borderRadius: 12,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4.65,
//     elevation: 8,
//   },
//   cardHeader: { marginBottom: 8 },
//   cardTitle: { fontSize: 18, fontWeight: '700', color: '#5A7FE2', marginBottom: 6 },
//   cardDesc: { fontSize: 15, color: '#475569', lineHeight: 20 },
//   logoutCard: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
//   logoutText: { color: '#dc2626' },
// });


import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminDashboard({ navigation }) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Get token from AsyncStorage for API calls
    const getToken = async () => {
      const savedToken = await AsyncStorage.getItem("token");
      setToken(savedToken);
    };
    getToken();
  }, []);
  const dashboardItems = [
    { title: "Manage Farmers", desc: "View, edit & approve farmer accounts", icon: "people", screen: "ManageFarmers" },
    { title: "Manage Plots", desc: "Review plot registrations & status", icon: "leaf", screen: "ManagePlots" },
    { title: "ML Verification", desc: "Run ML analysis & verify carbon credits", icon: "analytics-outline", screen: "Verification" },
    { title: "Carbon Credit Reports", desc: "View MRV stats & credit calculations", icon: "analytics", screen: "CarbonReportsScreen" },
    { title: "Marketplace Users", desc: "Verify buyers/sellers & transactions", icon: "cart", screen: "MarketplaceUsers" },
    { title: "System Settings", desc: "App configurations & permissions", icon: "settings", screen: "SystemSettings" },
    { title: "Profile", desc: "Manage your account details", icon: "person-circle", screen: "Profile" },
  ];

  return (
    <LinearGradient
      colors={['#4A90E2', '#7B68EE']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Welcome Admin</Text>
          </View>

          {/* Dashboard Cards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Manage System</Text>

            {dashboardItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(item.screen, { token })} // Navigate with token
              >
                <View style={styles.cardHeader}>
                  <Ionicons name={item.icon} size={32} color="#5A7FE2" />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.card, styles.logoutCard]}
              onPress={() => navigation.replace("Login")}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="log-out" size={32} color="#dc2626" />
              </View>
              <Text style={[styles.cardTitle, styles.logoutText]}>Logout</Text>
              <Text style={styles.cardDesc}>Sign out of admin account</Text>
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
  header: { paddingHorizontal: 20, marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardHeader: { marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#5A7FE2', marginBottom: 6 },
  cardDesc: { fontSize: 15, color: '#475569', lineHeight: 20 },
  logoutCard: { borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2' },
  logoutText: { color: '#dc2626' },
});