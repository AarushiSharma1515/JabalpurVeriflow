import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import API from "../services/projectsService";

export default function ManageFarmerScreen({ navigation, route }) {
  const token = route.params?.token; // pass user token from login
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch all farmers from backend
  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const data = await API.getAllFarmers(token);
      setFarmers(data);
    } catch (err) {
      console.log("Error fetching farmers:", err.response?.data || err.message);
      Alert.alert("Error", "Unable to load farmers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  // ===== Filter farmers by search & status =====
  const filteredFarmers = farmers.filter(farmer => {
    const matchesSearch = farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          farmer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || farmer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ===== Farmer actions =====
  const handleApprove = (id, name) => {
    Alert.alert(
      "Approve Farmer",
      `Are you sure you want to approve ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await API.updateUserStatus(token, id, "approved");
              setFarmers(farmers.map(f => f._id === id ? { ...f, status: "approved" } : f));
              Alert.alert("Success", `${name} has been approved.`);
            } catch (err) {
              console.log("Error approving farmer:", err.response?.data || err.message);
              Alert.alert("Error", "Failed to approve farmer. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleReject = (id, name) => {
    Alert.alert(
      "Reject Farmer",
      `Are you sure you want to reject ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await API.updateUserStatus(token, id, "rejected");
              setFarmers(farmers.map(f => f._id === id ? { ...f, status: "rejected" } : f));
              Alert.alert("Success", `${name} has been rejected.`);
            } catch (err) {
              console.log("Error rejecting farmer:", err.response?.data || err.message);
              Alert.alert("Error", "Failed to reject farmer. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      "Delete Farmer",
      `Are you sure you want to permanently delete ${name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await API.deleteUser(token, id);
              setFarmers(farmers.filter(f => f._id !== id));
              Alert.alert("Deleted", `${name} has been removed from the system.`);
            } catch (err) {
              console.log("Error deleting farmer:", err.response?.data || err.message);
              Alert.alert("Error", "Failed to delete farmer. Please try again.");
            }
          },
        },
      ]
    );
  };

  // ===== Upload image per farmer =====
  const handleUploadImage = async (farmerId, farmerName) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.cancelled) return;

      const file = { uri: result.uri };
      const metadata = {
        timestamp: Date.now(),
        latitude: result.latitude || null,
        longitude: result.longitude || null,
      };

      // Upload image using API
      const res = await API.uploadImage(farmerId, token, file, metadata);
      console.log("Image uploaded:", res);
      Alert.alert("Success", `${farmerName}'s image has been uploaded.`);
    } catch (err) {
      console.log("Upload error:", err.response?.data || err.message);
      Alert.alert("Error", "Image upload failed.");
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case "pending": return "#f59e0b";
      case "approved": return "#10b981";
      case "rejected": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case "pending": return "time-outline";
      case "approved": return "checkmark-circle";
      case "rejected": return "close-circle";
      default: return "help-circle";
    }
  };

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#4A90E2', '#7B68EE']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Manage Farmers</Text>
            <Text style={styles.subtitle}>{farmers.length} Total Farmers</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {["all","pending","approved","rejected"].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, filterStatus===status && styles.filterButtonActive]}
              onPress={()=>setFilterStatus(status)}
            >
              <Text style={[styles.filterButtonText, filterStatus===status && styles.filterButtonTextActive]}>
                {status.charAt(0).toUpperCase()+status.slice(1)} ({status==="all"?farmers.length:farmers.filter(f=>f.status===status).length})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Farmer List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredFarmers.length===0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyText}>No farmers found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? "Try adjusting your search" : "No farmers match the selected filter"}
              </Text>
            </View>
          ) : (
            filteredFarmers.map(farmer => (
              <View key={farmer._id} style={styles.farmerCard}>
                <View style={styles.farmerHeader}>
                  <View style={styles.farmerAvatar}>
                    <Ionicons name="person" size={24} color="#5A7FE2" />
                  </View>
                  <View style={styles.farmerInfo}>
                    <Text style={styles.farmerName}>{farmer.name}</Text>
                    <Text style={styles.farmerEmail}>{farmer.email}</Text>
                    <Text style={styles.farmerPhone}>{farmer.phone}</Text>
                  </View>
                  <View style={[styles.statusBadge,{backgroundColor:getStatusColor(farmer.status)+'20'}]}>
                    <Ionicons name={getStatusIcon(farmer.status)} size={16} color={getStatusColor(farmer.status)} />
                    <Text style={[styles.statusText,{color:getStatusColor(farmer.status)}]}>
                      {farmer.status ? farmer.status.charAt(0).toUpperCase()+farmer.status.slice(1) : 'Unknown'}
                    </Text>
                  </View>
                </View>

                <View style={styles.farmerDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="leaf-outline" size={16} color="#64748b" />
                    <Text style={styles.detailText}>{farmer.plots || 0} Plots</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionContainer}>
                  {farmer.status==="pending" && (
                    <>
                      <TouchableOpacity style={[styles.actionButton,styles.approveButton]} onPress={()=>handleApprove(farmer._id,farmer.name)}>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionButton,styles.rejectButton]} onPress={()=>handleReject(farmer._id,farmer.name)}>
                        <Ionicons name="close" size={18} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {farmer.status==="approved" && (
                    <TouchableOpacity style={[styles.actionButton,styles.rejectButton]} onPress={()=>handleReject(farmer._id,farmer.name)}>
                      <Ionicons name="close" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Revoke</Text>
                    </TouchableOpacity>
                  )}
                  {farmer.status==="rejected" && (
                    <TouchableOpacity style={[styles.actionButton,styles.approveButton]} onPress={()=>handleApprove(farmer._id,farmer.name)}>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                  )}

                  {/* Delete */}
                  <TouchableOpacity style={[styles.actionButton,styles.deleteButton]} onPress={()=>handleDelete(farmer._id,farmer.name)}>
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ====== Styles ======
const styles = StyleSheet.create({
  gradient:{flex:1},
  container:{flex:1},
  header:{flexDirection:'row',alignItems:'center',paddingHorizontal:20,paddingTop:10,paddingBottom:20},
  backButton:{marginRight:15,padding:5},
  headerTextContainer:{flex:1},
  title:{fontSize:28,fontWeight:'bold',color:'#FFFFFF',marginBottom:4},
  subtitle:{fontSize:14,color:'#FFFFFF',opacity:0.9},
  searchContainer:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFFFFF',marginHorizontal:20,marginBottom:15,borderRadius:12,paddingHorizontal:15,height:48,elevation:3},
  searchIcon:{marginRight:10},
  searchInput:{flex:1,fontSize:16,color:'#1e293b'},
  filterContainer:{marginBottom:15,maxHeight:50},
  filterContent:{paddingHorizontal:20,gap:10,flexDirection:'row',alignItems:'center'},
  filterButton:{paddingHorizontal:16,paddingVertical:10,borderRadius:10,backgroundColor:'rgba(255,255,255,0.3)',marginRight:10,minHeight:40},
  filterButtonActive:{backgroundColor:'#FFFFFF'},
  filterButtonText:{fontSize:14,fontWeight:'600',color:'#FFFFFF'},
  filterButtonTextActive:{color:'#5A7FE2'},
  scrollView:{flex:1},
  scrollContent:{paddingHorizontal:20,paddingBottom:20},
  emptyContainer:{alignItems:'center',justifyContent:'center',paddingVertical:60},
  emptyText:{fontSize:18,fontWeight:'600',color:'#FFFFFF',marginTop:15},
  emptySubtext:{fontSize:14,color:'#FFFFFF',opacity:0.8,marginTop:5},
  farmerCard:{backgroundColor:'#FFFFFF',borderRadius:12,padding:16,marginBottom:12,elevation:8},
  farmerHeader:{flexDirection:'row',alignItems:'flex-start',marginBottom:12},
  farmerAvatar:{width:48,height:48,borderRadius:24,backgroundColor:'#E0E7FF',alignItems:'center',justifyContent:'center',marginRight:12},
  farmerInfo:{flex:1},
  farmerName:{fontSize:18,fontWeight:'700',color:'#1e293b',marginBottom:4},
  farmerEmail:{fontSize:14,color:'#64748b',marginBottom:2},
  farmerPhone:{fontSize:14,color:'#64748b'},
  statusBadge:{flexDirection:'row',alignItems:'center',paddingHorizontal:10,paddingVertical:5,borderRadius:12,gap:4},
  statusText:{fontSize:12,fontWeight:'600'},
  farmerDetails:{flexDirection:'row',marginBottom:12,paddingTop:12,borderTopWidth:1,borderTopColor:'#e2e8f0'},
  detailItem:{flexDirection:'row',alignItems:'center',gap:6},
  detailText:{fontSize:14,color:'#64748b'},
  actionContainer:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  actionButton:{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:10,paddingHorizontal:8,borderRadius:8,gap:6},
  approveButton:{backgroundColor:'#3b82f6'},
  rejectButton:{backgroundColor:'#f97316'},
  deleteButton:{backgroundColor:'#e11d48'},
  uploadButton:{backgroundColor:'#10b981'},
  actionButtonText:{color:'#FFFFFF',fontSize:14,fontWeight:'600'},
});
