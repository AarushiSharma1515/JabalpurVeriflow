import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { API_BASE } from "../services/projectsService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function VerificationScreen({ route, navigation }) {
  const { token: propToken } = route.params || {};
  const [token, setToken] = useState(propToken);
  const [currentUser, setCurrentUser] = useState(null);

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [mlResults, setMlResults] = useState(null);
  const [resultsModalVisible, setResultsModalVisible] = useState(false);
  const [analysisStage, setAnalysisStage] = useState("");

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (token && currentUser) {
      fetchProjects();
    }
  }, [token, currentUser]);

  const loadUserData = async () => {
    try {
      // Get token from storage if not passed via props
      let authToken = propToken;
      if (!authToken) {
        authToken = await AsyncStorage.getItem("token");
      }
      
      // Get user data
      const userStr = await AsyncStorage.getItem("user");
      let user = null;
      if (userStr) {
        user = JSON.parse(userStr);
      }
      
      setToken(authToken);
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to load user session");
    }
  };

  const fetchProjects = async () => {
    if (!token) {
      console.log("No token available");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Filter projects without ML results AND owned by current farmer
      // Backend now filters by owner, but we add extra safety
      const pendingProjects = (res.data.projects || []).filter((p) => {
        // Check if project has no ML results
        const hasNoML = !p.mlAnalysisResults;
        
        // Extra safety: check if current user owns this project
        const projectOwnerId = p.owner?._id || p.owner;
        const currentUserId = currentUser?.id;
        const isOwner = projectOwnerId === currentUserId;
        
        // Only show projects that need ML AND belong to this farmer
        return hasNoML && isOwner;
      });
      
      setProjects(pendingProjects);
      
      if (pendingProjects.length === 0) {
        console.log("No pending projects found for this farmer");
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      Alert.alert("Error", err?.response?.data?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const runMLAnalysis = async (project) => {
    setSelectedProject(project);
    setAnalyzing(true);
    setAnalysisStage("Sampling satellite data...");

    try {
      // Using verified Sundarbans reference coordinates (default)
      const payload = {
        points: [
          { lat: 21.92, lon: 89.18, date: "2023-06-01" },
          { lat: 21.93, lon: 89.19, date: "2023-06-01" },
          { lat: 21.94, lon: 89.20, date: "2023-06-01" },
          { lat: 21.95, lon: 89.21, date: "2023-06-01" },
        ],
        startDate: "2023-01-01",
        endDate: "2023-12-31",
        projectId: project._id,  // Add projectId so ML service saves to MLResults
      };

      setAnalysisStage("Running ML model on satellite data...");

      const response = await axios.post(
        `${API_BASE}/api/mrv/predict`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 600000,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || "ML prediction failed");
      }

      const result = response.data.result;

      // Format ML results according to your schema
      const mlData = {
        status: "success",
        job_id: response.data.job_id,
        final_results: {
          agb_Mg_per_ha: result.mean_pred_agb_Mg_per_ha,
          carbon_sequestration_kg: result.mean_pred_carbon_Mg_per_ha * 1000,
          study_area_ha: project.areaHectares || 1,
        },
        component_results: {
          satellite: {
            agb_Mg_per_ha: result.mean_pred_agb_Mg_per_ha,
            height_m: result.mean_pred_height_m,
            confidence: result.mean_pred_confidence,
            n_points: result.n_points,
          },
          drone: {
            agb_Mg_per_ha: result.mean_pred_agb_Mg_per_ha,
            area_m2: (project.areaHectares || 1) * 10000,
            carbon_kg: result.mean_pred_carbon_Mg_per_ha * 1000,
            co2_kg: result.mean_pred_co2_t_per_ha * 1000,
            confidence: result.mean_pred_confidence,
          },
        },
        co2_t_per_ha: result.mean_pred_co2_t_per_ha,
      };

      // Save ML results to MongoDB and update status to underReview
      await axios.patch(
        `${API_BASE}/api/projects/${project._id}`,
        { 
          mlAnalysisResults: mlData, 
          status: "underReview" 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMlResults(mlData);
      setResultsModalVisible(true);
      setAnalysisStage("");
      
      // Refresh the project list
      await fetchProjects();
      
    } catch (error) {
      console.error("ML Analysis Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "ML analysis failed";
      Alert.alert("Analysis Failed", errorMessage);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0d1f0d", "#0f2a0f"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4dff4d" />
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0d1f0d", "#0f2a0f"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>ML Verification</Text>
            <View style={styles.backButton} />
          </View>

          {/* Farmer Info Banner */}
          {currentUser && (
            <View style={styles.infoBanner}>
              <Ionicons name="person-circle" size={20} color="#4dff4d" />
              <Text style={styles.infoText}>
                Logged in as: {currentUser.name || currentUser.email}
              </Text>
            </View>
          )}

          {/* Analyzing Banner */}
          {analyzing && (
            <View style={styles.analyzingBanner}>
              <ActivityIndicator size="small" color="#4dff4d" />
              <Text style={styles.analyzingText}>
                {analysisStage || "Running ML Analysis... This may take 2-5 minutes"}
              </Text>
            </View>
          )}

          {/* Projects List */}
          {projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#4dff4d" />
              <Text style={styles.emptyText}>No plots pending verification</Text>
              <Text style={styles.emptySubtext}>
                All your plots have ML results and are under admin review
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Your Plots ({projects.length})</Text>
              {projects.map((project) => (
                <View key={project._id} style={styles.projectCard}>
                  <View style={styles.projectHeader}>
                    <Ionicons name="leaf" size={24} color="#4dff4d" />
                    <Text style={styles.projectTitle}>{project.title}</Text>
                  </View>
                  <View style={styles.projectDetails}>
                    <Text style={styles.projectDetail}>Area: {project.areaHectares} hectares</Text>
                    <Text style={styles.projectDetail}>Location: {typeof project.location === 'string' ? project.location : project.location?.address || "Not specified"}</Text>
                    <Text style={styles.projectDetail}>Status: {project.status}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.analyzeButton, analyzing && styles.disabledButton]}
                    onPress={() => runMLAnalysis(project)}
                    disabled={analyzing}
                  >
                    <Ionicons name="analytics" size={20} color="#000000" />
                    <Text style={styles.analyzeButtonText}>
                      {analyzing && selectedProject?._id === project._id ? "Analyzing..." : "Run ML Analysis"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Results Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={resultsModalVisible}
        onRequestClose={() => setResultsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Analysis Results</Text>
                <TouchableOpacity onPress={() => setResultsModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#aaaaaa" />
                </TouchableOpacity>
              </View>

              {mlResults && (
                <>
                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Above-Ground Biomass</Text>
                    <Text style={styles.resultValue}>
                      {mlResults.final_results?.agb_Mg_per_ha?.toFixed(2)} Mg/ha
                    </Text>
                  </View>

                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Carbon Sequestration</Text>
                    <Text style={styles.resultValue}>
                      {mlResults.final_results?.carbon_sequestration_kg?.toFixed(2)} kg
                    </Text>
                  </View>

                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>CO₂ Equivalent</Text>
                    <Text style={styles.resultValue}>
                      {mlResults.co2_t_per_ha?.toFixed(2)} t/ha
                    </Text>
                  </View>

                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Canopy Height</Text>
                    <Text style={styles.resultValue}>
                      {mlResults.component_results?.satellite?.height_m?.toFixed(2)} m
                    </Text>
                  </View>

                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Model Confidence</Text>
                    <Text style={styles.resultValue}>
                      {((mlResults.component_results?.satellite?.confidence || 0) * 100).toFixed(1)}%
                    </Text>
                  </View>

                  <View style={styles.submittedBanner}>
                    <Ionicons name="checkmark-circle" size={24} color="#4dff4d" />
                    <Text style={styles.submittedText}>
                      Results saved. Submitted for admin review.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => {
                      setResultsModalVisible(false);
                      setMlResults(null);
                      setSelectedProject(null);
                      fetchProjects();
                    }}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#aaaaaa", fontSize: 16, marginTop: 12 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#0a1a0a",
    borderWidth: 1,
    borderColor: "#1a2e1a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#2a3e2a",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#FFFFFF" },

  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#2a3e2a",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: { marginLeft: 10, color: "#4dff4d", fontSize: 14, fontWeight: "600" },

  analyzingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#2a3e2a",
    padding: 15,
    borderRadius: 14,
    marginBottom: 20,
  },
  analyzingText: { marginLeft: 10, color: "#dddddd", fontSize: 14, fontWeight: "600" },

  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600", marginTop: 20 },
  emptySubtext: { color: "#aaaaaa", fontSize: 14, marginTop: 10, textAlign: "center", paddingHorizontal: 40 },

  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginBottom: 15 },

  projectCard: {
    backgroundColor: "#1a2e1a",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  projectHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  projectTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginLeft: 10, flex: 1 },
  projectDetails: { marginBottom: 12 },
  projectDetail: { fontSize: 14, color: "#aaaaaa", marginBottom: 4 },

  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4dff4d",
    paddingVertical: 12,
    borderRadius: 10,
  },
  disabledButton: { backgroundColor: "#2f4530" },
  analyzeButtonText: { color: "#000000", fontSize: 16, fontWeight: "700", marginLeft: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#0a1a0a",
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.85,
    padding: 25,
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" },

  resultCard: {
    backgroundColor: "#1a2e1a",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  resultLabel: { fontSize: 14, color: "#aaaaaa", marginBottom: 6 },
  resultValue: { fontSize: 24, fontWeight: "bold", color: "#4dff4d" },

  submittedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#4dff4d",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  submittedText: { color: "#4dff4d", fontSize: 14, fontWeight: "600", marginLeft: 10, flex: 1 },

  doneButton: {
    backgroundColor: "#4dff4d",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: { color: "#000000", fontSize: 16, fontWeight: "700" },
});