// // import React from "react";
// // import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from "react-native";
// // import { LinearGradient } from 'expo-linear-gradient';
// // import AsyncStorage from "@react-native-async-storage/async-storage";
// // import ChatBox from "../components/ChatBox";


// // export default function FarmerDashboard({ navigation }) {

// //   const goToMyPlots = async () => {
// //   try {
// //     const token = await AsyncStorage.getItem("token");
// //     navigation.navigate("MyPlots", { token });
// //   } catch (err) {
// //     console.error("Failed to get token", err);
// //     alert("Unable to open plots. Please try again.");
// //   }
// // };

// //   return (
// //     <LinearGradient
// //       colors={['#4A90E2', '#7B68EE']}
// //       style={styles.gradient}
// //       start={{ x: 0, y: 0 }}
// //       end={{ x: 1, y: 1 }}
// //     >
// //       <SafeAreaView style={styles.container}>
// //         <ScrollView
// //           style={styles.scrollView}
// //           contentContainerStyle={styles.scrollContent}
// //           showsVerticalScrollIndicator={false}
// //         >
// //           <View style={styles.header}>
// //             <Text style={styles.title}>Farmer Dashboard</Text>
// //             <Text style={styles.subtitle}>Blue Carbon MRV • Field Operator</Text>
// //           </View>

// //           {/* SECTION: Quick Actions */}
// //           <View style={styles.section}>
// //             <Text style={styles.sectionTitle}>Quick Actions</Text>

// //             <TouchableOpacity
// //               style={styles.card}
// //               onPress={() => navigation.navigate("PlotRegistration")}
// //               activeOpacity={0.8}
// //             >
// //               <Text style={styles.cardTitle}>Add New Plot</Text>
// //               <Text style={styles.cardDesc}>Create a new mangrove plot entry.</Text>
// //             </TouchableOpacity>

// //             <TouchableOpacity
// //               style={styles.card}
// //               onPress={() => navigation.navigate("RecordFieldData")}
// //               activeOpacity={0.8}
// //             >
// //               <Text style={styles.cardTitle}>Record Field Data</Text>
// //               <Text style={styles.cardDesc}>
// //                 Add tree measurements, biomass, soil samples etc.
// //               </Text>
// //             </TouchableOpacity>

// //             <TouchableOpacity
// //               style={styles.card}
// //               onPress={() => navigation.navigate("GeoCapture")}
// //               activeOpacity={0.8}
// //             >
// //               <Text style={styles.cardTitle}>Upload Geo-Tagged Photos</Text>
// //               <Text style={styles.cardDesc}>
// //                 Capture images with GPS for verification.
// //               </Text>
// //             </TouchableOpacity>
// //           </View>

// //           {/* SECTION: Reports */}
// //           <View style={styles.section}>
// //             <Text style={styles.sectionTitle}>Reports & Marketplace</Text>

// //             <TouchableOpacity
// //              style={styles.card}
// //              onPress={goToMyPlots}   // just pass the function reference
// //              activeOpacity={0.8}>
// //               <Text style={styles.cardTitle}>My Plots</Text>
// //               <Text style={styles.cardDesc}>View all registered plots.</Text>
// //               </TouchableOpacity>

// //             <TouchableOpacity
// //               style={styles.card}
// //               onPress={() => navigation.navigate("Marketplace")}
// //               activeOpacity={0.8}
// //             >
// //               <Text style={styles.cardTitle}>Marketplace</Text>
// //               <Text style={styles.cardDesc}>
// //                 Browse and purchase carbon credit NFTs.
// //               </Text>
// //             </TouchableOpacity>
// //           </View>
// //         </ScrollView>

// //         {/* ChatBox Component - Fixed at bottom, not scrolling */}
// //         <ChatBox apiUrl="https://precosmic-charlene-germfree.ngrok-free.dev" />
// //       </SafeAreaView>
// //     </LinearGradient>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   gradient: {
// //     flex: 1,
// //   },
// //   container: {
// //     flex: 1,
// //   },
// //   scrollView: {
// //     flex: 1,
// //   },
// //   scrollContent: {
// //     paddingVertical: 20,
// //   },
// //   header: {
// //     paddingHorizontal: 20,
// //     marginBottom: 24,
// //     alignItems: 'center',
// //   },
// //   title: {
// //     fontSize: 28,
// //     fontWeight: 'bold',
// //     color: '#FFFFFF',
// //     marginBottom: 8,
// //   },
// //   subtitle: {
// //     fontSize: 16,
// //     color: '#FFFFFF',
// //     opacity: 0.9,
// //   },
// //   section: {
// //     paddingHorizontal: 20,
// //     marginBottom: 25,
// //   },
// //   sectionTitle: {
// //     fontSize: 20,
// //     fontWeight: '700',
// //     color: '#FFFFFF',
// //     marginBottom: 14,
// //   },
// //   card: {
// //     backgroundColor: '#FFFFFF',
// //     padding: 18,
// //     borderRadius: 12,
// //     marginBottom: 12,
// //     shadowColor: '#000',
// //     shadowOffset: {
// //       width: 0,
// //       height: 4,
// //     },
// //     shadowOpacity: 0.3,
// //     shadowRadius: 4.65,
// //     elevation: 8,
// //   },
// //   cardTitle: {
// //     fontSize: 18,
// //     fontWeight: '700',
// //     color: '#5A7FE2',
// //     marginBottom: 6,
// //   },
// //   cardDesc: {
// //     fontSize: 15,
// //     color: '#475569',
// //     lineHeight: 20,
// //   },
// // });


// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image } from "react-native";
// import { LinearGradient } from 'expo-linear-gradient';
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import ChatBox from "../components/ChatBox";


// export default function FarmerDashboard({ navigation }) {
//   const [userInitial, setUserInitial] = useState("U");
//   const [userPhoto, setUserPhoto] = useState(null);

//   useEffect(() => {
//     const loadUser = async () => {
//       try {
//         const raw = await AsyncStorage.getItem("user");
//         if (!raw) return;
//         const parsed = JSON.parse(raw);
//         if (parsed?.name) setUserInitial(parsed.name.charAt(0).toUpperCase());
//         if (parsed?.photoUrl) setUserPhoto(parsed.photoUrl);
//       } catch (err) {
//         console.error("Failed to load user for avatar", err);
//       }
//     };
//     loadUser();
//   }, []);

//   const goToMyPlots = async () => {
//   try {
//     const token = await AsyncStorage.getItem("token");
//     navigation.navigate("MyPlots", { token });
//   } catch (err) {
//     console.error("Failed to get token", err);
//     alert("Unable to open plots. Please try again.");
//   }
// };

//   return (
//     <LinearGradient
//       colors={['#4A90E2', '#7B68EE']}
//       style={styles.gradient}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 1, y: 1 }}
//     >
//       <SafeAreaView style={styles.container}>
//         <ScrollView
//           style={styles.scrollView}
//           contentContainerStyle={styles.scrollContent}
//           showsVerticalScrollIndicator={false}
//         >
//           <View style={styles.header}>
//             <Text style={styles.title}>Farmer Dashboard</Text>
//             <Text style={styles.subtitle}>Blue Carbon MRV • Field Operator</Text>
//             <TouchableOpacity
//               style={styles.avatar}
//               activeOpacity={0.85}
//               onPress={() => navigation.navigate("Profile")}
//             >
//               {userPhoto ? (
//                 <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
//               ) : (
//                 <Text style={styles.avatarText}>{userInitial}</Text>
//               )}
//             </TouchableOpacity>
//           </View>

//           {/* SECTION: Quick Actions */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Quick Actions</Text>

//             <TouchableOpacity
//               style={styles.card}
//               onPress={() => navigation.navigate("PlotRegistration")}
//               activeOpacity={0.8}
//             >
//               <Text style={styles.cardTitle}>Add New Plot</Text>
//               <Text style={styles.cardDesc}>Create a new mangrove plot entry.</Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.card}
//               onPress={() => navigation.navigate("RecordFieldData")}
//               activeOpacity={0.8}
//             >
//               <Text style={styles.cardTitle}>Record Field Data</Text>
//               <Text style={styles.cardDesc}>
//                 Add tree measurements, biomass, soil samples etc.
//               </Text>
//             </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.card}
//               onPress={() => navigation.navigate("GeoCapture")}
//               activeOpacity={0.8}
//             >
//               <Text style={styles.cardTitle}>Upload Geo-Tagged Photos</Text>
//               <Text style={styles.cardDesc}>
//                 Capture images with GPS for verification.
//               </Text>
//             </TouchableOpacity>

//           </View>

//           {/* SECTION: Reports */}
//           <View style={styles.section}>
//             <Text style={styles.sectionTitle}>Reports & Marketplace</Text>

//             <TouchableOpacity
//              style={styles.card}
//              onPress={goToMyPlots}   // just pass the function reference
//              activeOpacity={0.8}>
//               <Text style={styles.cardTitle}>My Plots</Text>
//               <Text style={styles.cardDesc}>View all registered plots.</Text>
//               </TouchableOpacity>

//             <TouchableOpacity
//               style={styles.card}
//               onPress={() => navigation.navigate("Marketplace")}
//               activeOpacity={0.8}
//             >
//               <Text style={styles.cardTitle}>Marketplace</Text>
//               <Text style={styles.cardDesc}>
//                 Browse and purchase carbon credit NFTs.
//               </Text>
//             </TouchableOpacity>
//           </View>
//         </ScrollView>

//         {/* ChatBox Component - Fixed at bottom, not scrolling */}
//         <ChatBox apiUrl="https://precosmic-charlene-germfree.ngrok-free.dev" />
//       </SafeAreaView>
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   gradient: {
//     flex: 1,
//   },
//   container: {
//     flex: 1,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     paddingVertical: 20,
//   },
//   header: {
//     paddingHorizontal: 20,
//     marginBottom: 24,
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#FFFFFF',
//     marginBottom: 8,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#FFFFFF',
//     opacity: 0.9,
//   },
//   avatar: {
//     position: 'absolute',
//     right: 20,
//     top: 10,
//     width: 42,
//     height: 42,
//     borderRadius: 21,
//     backgroundColor: '#FFFFFF',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: 'rgba(255,255,255,0.6)',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//     elevation: 6,
//   },
//   avatarText: {
//     color: '#5A7FE2',
//     fontWeight: '700',
//     fontSize: 16,
//   },
//   avatarImage: {
//     width: 42,
//     height: 42,
//     borderRadius: 21,
//   },
//   section: {
//     paddingHorizontal: 20,
//     marginBottom: 25,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#FFFFFF',
//     marginBottom: 14,
//   },
//   card: {
//     backgroundColor: '#FFFFFF',
//     padding: 18,
//     borderRadius: 12,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 4.65,
//     elevation: 8,
//   },
//   cardTitle: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#5A7FE2',
//     marginBottom: 6,
//   },
//   cardDesc: {
//     fontSize: 15,
//     color: '#475569',
//     lineHeight: 20,
//   },
// });


import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Image } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from "@react-native-async-storage/async-storage";
import ChatBox from "../components/ChatBox";


export default function FarmerDashboard({ navigation }) {
  const [userInitial, setUserInitial] = useState("U");
  const [userName, setUserName] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const raw = await AsyncStorage.getItem("user");
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.name) setUserName(parsed.name);
        if (parsed?.name) setUserInitial(parsed.name.charAt(0).toUpperCase());
        if (parsed?.photoUrl) setUserPhoto(parsed.photoUrl);
      } catch (err) {
        console.error("Failed to load user for avatar", err);
      }
    };
    loadUser();
  }, []);

  const goToMyPlots = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      navigation.navigate("MyPlots", { token });
    } catch (err) {
      console.error("Failed to get token", err);
      alert("Unable to open plots. Please try again.");
    }
  };

  const goToMLVerification = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        alert("Unable to open ML verification. Please login again.");
        return;
      }
      navigation.navigate("Verification", { token });
    } catch (err) {
      console.error("Failed to get token", err);
      alert("Unable to open ML verification. Please try again.");
    }
  };

  return (
    <LinearGradient
      colors={['#0d1f0d', '#0d1f0d']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.greeting}>Hello, {userName || userInitial}</Text>
                <Text style={styles.roleText}>Blue Carbon MRV • Field Operator</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.avatar}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Profile")}
            >
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{userInitial}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>Search plots...</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillContainer}
          >
            {["All", "Plots", "Market"].map((pill) => {
              const active = pill === "All";
              const isPlots = pill === "Plots";
              const isMarket = pill === "Market";
              const PillComponent = isPlots || isMarket ? TouchableOpacity : View;
              const pillProps =
                isPlots
                  ? { onPress: goToMyPlots, activeOpacity: 0.8 }
                  : isMarket
                    ? { onPress: () => navigation.navigate("Marketplace"), activeOpacity: 0.8 }
                    : {};

              return (
                <PillComponent
                  key={pill}
                  style={[
                    styles.pill,
                    active ? styles.pillActive : styles.pillInactive
                  ]}
                  {...pillProps}
                >
                  <Text style={active ? styles.pillTextActive : styles.pillTextInactive}>
                    {pill}
                  </Text>
                </PillComponent>
              );
            })}
          </ScrollView>

          {/* SECTION: Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("PlotRegistration")}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>Add New Plot</Text>
                <View style={[styles.cardActionIcon, styles.cardActionPrimary]}>
                  <Text style={styles.cardActionTextDark}>↗</Text>
                </View>
              </View>
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardStat}>🌿 Mangrove</Text>
                <Text style={styles.cardStatDivider}>|</Text>
                <Text style={styles.cardStat}>🌊 Saltmarsh</Text>
              </View>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("RecordFieldData")}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>Record Field Data</Text>
                <View style={[styles.cardActionIcon, styles.cardActionSecondary]}>
                  <Text style={styles.cardActionTextLight}>↗</Text>
                </View>
              </View>
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardStat}>📏 Biomass</Text>
                <Text style={styles.cardStatDivider}>|</Text>
                <Text style={styles.cardStat}>🌱 Soil</Text>
              </View>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("GeoCapture")}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>Upload Geo-Tagged Photos</Text>
                <View style={[styles.cardActionIcon, styles.cardActionSecondary]}>
                  <Text style={styles.cardActionTextLight}>↗</Text>
                </View>
              </View>
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardStat}>📍 GPS</Text>
                <Text style={styles.cardStatDivider}>|</Text>
                <Text style={styles.cardStat}>📸 Tagged</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.card}
              onPress={goToMLVerification}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>Verify with ML</Text>
                <View style={[styles.cardActionIcon, styles.cardActionPrimary]}>
                  <Text style={styles.cardActionTextDark}>↗</Text>
                </View>
              </View>
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardStat}>🤖 Analysis</Text>
                <Text style={styles.cardStatDivider}>|</Text>
                <Text style={styles.cardStat}>✅ Verification</Text>
              </View>
            </TouchableOpacity>



          </View>

          {/* SECTION: Reports */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reports & Marketplace</Text>

            <TouchableOpacity
              style={styles.card}
              onPress={goToMyPlots}   // just pass the function reference
              activeOpacity={0.8}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>My Plots</Text>
                <View style={[styles.cardActionIcon, styles.cardActionPrimary]}>
                  <Text style={styles.cardActionTextDark}>↗</Text>
                </View>
              </View>
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardStat}>🗺 Registered</Text>
                <Text style={styles.cardStatDivider}>|</Text>
                <Text style={styles.cardStat}>📊 Active</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("Marketplace")}
              activeOpacity={0.8}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.cardTitle}>Marketplace</Text>
                <View style={[styles.cardActionIcon, styles.cardActionSecondary]}>
                  <Text style={styles.cardActionTextLight}>↗</Text>
                </View>
              </View>
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardStat}>💰 NFTs</Text>
                <Text style={styles.cardStatDivider}>|</Text>
                <Text style={styles.cardStat}>🌍 Carbon</Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ChatBox Component - Fixed at bottom, not scrolling */}
        <ChatBox apiUrl="https://precosmic-charlene-germfree.ngrok-free.dev" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#0d1f0d',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#0a1a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a2e1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextGroup: {
    marginLeft: 12,
    flexShrink: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  roleText: {
    fontSize: 13,
    color: '#aaaaaa',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a2e1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 6,
  },
  avatarText: {
    color: '#4dff4d',
    fontWeight: '700',
    fontSize: 16,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a2e1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    marginLeft: 12,
  },
  iconButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2e1a',
    borderWidth: 1,
    borderColor: '#2a3e2a',
    borderRadius: 14,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 14,
  },
  searchIcon: {
    color: '#aaaaaa',
    marginRight: 8,
    fontSize: 16,
  },
  searchPlaceholder: {
    color: '#aaaaaa',
    fontSize: 15,
  },
  pillContainer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  pill: {
    marginRight: 10,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: '#4dff4d',
    borderColor: '#4dff4d',
  },
  pillInactive: {
    backgroundColor: '#1a2e1a',
    borderColor: '#2a3e2a',
  },
  pillTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  pillTextInactive: {
    color: '#aaaaaa',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#1a2e1a',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a3e2a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 10,
    height: 130,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a3e2a',
  },
  cardActionPrimary: {
    backgroundColor: '#4dff4d',
  },
  cardActionSecondary: {
    backgroundColor: '#1e3a1e',
  },
  cardActionTextDark: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
  cardActionTextLight: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  cardStat: {
    color: '#aaaaaa',
    fontSize: 13,
    flex: 1,
  },
  cardStatDivider: {
    color: '#2a3e2a',
    marginHorizontal: 8,
  },
});