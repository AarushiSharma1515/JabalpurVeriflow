import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE } from "../services/projectsService";
import axios from "axios";

const { width, height } = Dimensions.get("window");

export default function ManagePlotsScreen({ route, navigation }) {
  const { token } = route.params;
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [mlResultsModalVisible, setMlResultsModalVisible] = useState(false);
  const [approvalNotesModalVisible, setApprovalNotesModalVisible] = useState(false);
  const [rejectionNotesModalVisible, setRejectionNotesModalVisible] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    if (token) fetchPlots();
  }, [token]);

  // Fetch all plots
  const fetchPlots = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlots(res.data.projects ?? []);
    } catch (err) {
      console.error("Error fetching plots:", err);
      Alert.alert(
        "Error",
        "Unable to load plots. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // View plot details
  const handleViewDetails = (plot) => {
    setSelectedPlot(plot);
    setDetailsModalVisible(true);
  };

  // View ML results
  const handleViewMLResults = (plot) => {
    setSelectedPlot(plot);
    setMlResultsModalVisible(true);
  };

  // Open approval notes modal
  const handleApproveClick = (plot) => {
    setSelectedPlot(plot);
    setApprovalNotes("");
    setApprovalNotesModalVisible(true);
  };

  // Open rejection notes modal
  const handleRejectClick = (plot) => {
    setSelectedPlot(plot);
    setRejectionNotes("");
    setRejectionNotesModalVisible(true);
  };

  // Approve plot with notes
  const handleApprove = async () => {
    if (!approvalNotes.trim()) {
      Alert.alert("Notes Required", "Please add approval notes");
      return;
    }

    if (!selectedPlot.mlAnalysisResults) {
      Alert.alert(
        "ML Analysis Missing",
        "This project does not have ML analysis results. Please ensure field verification was completed first."
      );
      return;
    }

    try {
      await axios.patch(
        `${API_BASE}/api/projects/${selectedPlot._id}`,
        {
          status: "verified",
          verification: {
            verified: true,
            notes: approvalNotes,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Plot has been approved successfully.");
      setApprovalNotesModalVisible(false);
      setDetailsModalVisible(false);
      fetchPlots();
    } catch (err) {
      console.error("Error approving plot:", err);
      Alert.alert("Error", "Failed to approve plot. Please try again.");
    }
  };

  // Reject plot with notes
  const handleReject = async () => {
    if (!rejectionNotes.trim()) {
      Alert.alert("Notes Required", "Please provide rejection reason");
      return;
    }

    try {
      await axios.patch(
        `${API_BASE}/api/projects/${selectedPlot._id}`,
        {
          status: "rejected",
          verification: {
            verified: false,
            notes: rejectionNotes,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Plot has been rejected.");
      setRejectionNotesModalVisible(false);
      setDetailsModalVisible(false);
      fetchPlots();
    } catch (err) {
      console.error("Error rejecting plot:", err);
      Alert.alert("Error", "Failed to reject plot. Please try again.");
    }
  };

  // Move project to review status
  const handleMoveToReview = async (plot) => {
    try {
      await axios.patch(
        `${API_BASE}/api/projects/${plot._id}`,
        { status: "underReview" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Project moved to review status and is ready for ML verification.");
      fetchPlots();
    } catch (err) {
      console.error("Error updating status:", err);
      Alert.alert("Error", "Failed to update project status. Please try again.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "#94a3b8";
      case "submitted":
        return "#f59e0b";
      case "underReview":
        return "#3b82f6";
      case "verified":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "draft":
        return "create-outline";
      case "submitted":
        return "time-outline";
      case "underReview":
        return "eye-outline";
      case "verified":
        return "checkmark-circle";
      case "rejected":
        return "close-circle";
      default:
        return "help-circle-outline";
    }
  };

  const Container = ({ children }) =>
    isWeb ? (
      <View style={styles.webScrollContainer}>{children}</View>
    ) : (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {children}
      </ScrollView>
    );

  if (loading) {
    return (
      <LinearGradient
        colors={["#4A90E2", "#7B68EE"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading plots...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#4A90E2", "#7B68EE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <Container>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Plots</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={fetchPlots}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {plots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={80} color="#FFFFFF" />
            <Text style={styles.noPlots}>No plots registered yet.</Text>
          </View>
        ) : (
          plots.map((plot) => {
            const id = plot._id;
            const name = plot.title || plot.name || "Unnamed Plot";
            const ownerName = plot.owner?.name || plot.ownerName || "Unknown";
            const status = plot.status || "draft";

            return (
              <View key={id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleContainer}>
                    <Ionicons name="leaf" size={24} color="#5A7FE2" />
                    <Text style={styles.cardTitle}>{name}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(status) },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(status)}
                      size={14}
                      color="#FFFFFF"
                    />
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                    <Text style={styles.infoText}>Owner: {ownerName}</Text>
                  </View>

                  {plot.location?.city && (
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#64748b"
                      />
                      <Text style={styles.infoText}>
                        {plot.location.city}, {plot.location.state}
                      </Text>
                    </View>
                  )}

                  {plot.areaHectares && (
                    <View style={styles.infoRow}>
                      <Ionicons
                        name="resize-outline"
                        size={16}
                        color="#64748b"
                      />
                      <Text style={styles.infoText}>
                        {plot.areaHectares} hectares
                      </Text>
                    </View>
                  )}

                  {plot.fieldVerification?.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10b981"
                      />
                      <Text style={styles.verifiedText}>
                        Field Verified
                      </Text>
                    </View>
                  )}

                  {plot.mlAnalysisResults && (
                    <View style={styles.mlBadge}>
                      <Ionicons name="analytics" size={16} color="#4A90E2" />
                      <Text style={styles.mlText}>ML Analysis Available</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => handleViewDetails(plot)}
                  >
                    <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.detailsButtonText}>Details</Text>
                  </TouchableOpacity>

                  {plot.mlAnalysisResults && (
                    <TouchableOpacity
                      style={styles.mlButton}
                      onPress={() => handleViewMLResults(plot)}
                    >
                      <Ionicons
                        name="analytics-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.mlButtonText}>ML Results</Text>
                    </TouchableOpacity>
                  )}

                  {/* Move to Review Button for draft/submitted projects */}
                  {(status === "draft" || status === "submitted") && (
                    <TouchableOpacity
                      style={styles.reviewButton}
                      onPress={() => handleMoveToReview(plot)}
                    >
                      <Ionicons
                        name="send-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.reviewButtonText}>Submit for Review</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Approval/Rejection for underReview status */}
                {status === "underReview" && (
                  <View style={styles.adminActionRow}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveClick(plot)}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectClick(plot)}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color="#FFFFFF"
                      />
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
        </Container>
      </SafeAreaView>

      {/* Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedPlot?.title}</Text>
                <TouchableOpacity
                  onPress={() => setDetailsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color="#475569" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailsContainer}>
                <Text style={styles.sectionTitle}>Project Information</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPlot?.description || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPlot?.location?.address},{" "}
                    {selectedPlot?.location?.city}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Area:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPlot?.areaHectares} hectares
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Crop Type:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPlot?.cropType || "N/A"}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: getStatusColor(selectedPlot?.status) },
                    ]}
                  >
                    {selectedPlot?.status}
                  </Text>
                </View>
              </View>

              {/* Field Verification Info */}
              {selectedPlot?.fieldVerification?.verified && (
                <View style={styles.verificationContainer}>
                  <Text style={styles.sectionTitle}>
                    Field Verification
                  </Text>
                  <View style={styles.verificationCard}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    <Text style={styles.verificationStatus}>Verified</Text>
                  </View>
                  <Text style={styles.verificationNotes}>
                    {selectedPlot.fieldVerification.notes}
                  </Text>
                </View>
              )}

              {/* Images */}
              {selectedPlot?.images && selectedPlot.images.length > 0 && (
                <View style={styles.imagesContainer}>
                  <Text style={styles.sectionTitle}>Project Images</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {selectedPlot.images.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedImage(img.url);
                          setImageModalVisible(true);
                        }}
                      >
                        <Image
                          source={{ uri: img.thumbnailUrl || img.url }}
                          style={styles.thumbnail}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ML Results Preview */}
              {selectedPlot?.mlAnalysisResults && (
                <View style={styles.mlPreviewContainer}>
                  <Text style={styles.sectionTitle}>ML Analysis Summary</Text>
                  <View style={styles.mlPreviewCard}>
                    <Text style={styles.mlPreviewLabel}>
                      Carbon Sequestration:
                    </Text>
                    <Text style={styles.mlPreviewValue}>
                      {selectedPlot.mlAnalysisResults.final_results?.carbon_sequestration_kg?.toFixed(
                        2
                      )}{" "}
                      kg
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewFullResultsButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      handleViewMLResults(selectedPlot);
                    }}
                  >
                    <Text style={styles.viewFullResultsText}>
                      View Full ML Results
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Admin Actions for underReview */}
              {selectedPlot?.status === "underReview" && (
                <View style={styles.modalAdminActions}>
                  <TouchableOpacity
                    style={styles.modalApproveButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      handleApproveClick(selectedPlot);
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.modalApproveText}>Approve Plot</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalRejectButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      handleRejectClick(selectedPlot);
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.modalRejectText}>Reject Plot</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ML Results Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={mlResultsModalVisible}
        onRequestClose={() => setMlResultsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mlModalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.mlResultsHeader}>
                <Text style={styles.mlResultsTitle}>📊 ML Analysis Results</Text>
                <TouchableOpacity
                  onPress={() => setMlResultsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color="#475569" />
                </TouchableOpacity>
              </View>

              {selectedPlot?.mlAnalysisResults && (
                <>
                  <View style={styles.mlCard}>
                    <Text style={styles.mlCardTitle}>
                      💚 Carbon Sequestration
                    </Text>
                    <Text style={styles.mlCardValue}>
                      {selectedPlot.mlAnalysisResults.final_results?.carbon_sequestration_kg?.toFixed(
                        2
                      )}{" "}
                      kg
                    </Text>
                  </View>

                  <View style={styles.mlCard}>
                    <Text style={styles.mlCardTitle}>🌳 Biomass (AGB)</Text>
                    <Text style={styles.mlCardValue}>
                      {selectedPlot.mlAnalysisResults.final_results?.agb_mg_ha?.toFixed(
                        2
                      )}{" "}
                      Mg/ha
                    </Text>
                  </View>

                  <View style={styles.mlRow}>
                    <View style={[styles.mlCard, styles.mlHalfCard]}>
                      <Text style={styles.mlSmallCardTitle}>🛰️ Satellite</Text>
                      <Text style={styles.mlSmallCardValue}>
                        {selectedPlot.mlAnalysisResults.component_results?.satellite?.agb_mg_ha?.toFixed(
                          1
                        )}
                      </Text>
                      <Text style={styles.mlSmallCardSubtext}>
                        Confidence:{" "}
                        {(
                          (selectedPlot.mlAnalysisResults.component_results
                            ?.satellite?.confidence || 0) * 100
                        ).toFixed(0)}
                        %
                      </Text>
                    </View>

                    <View style={[styles.mlCard, styles.mlHalfCard]}>
                      <Text style={styles.mlSmallCardTitle}>🚁 Drone</Text>
                      <Text style={styles.mlSmallCardValue}>
                        {selectedPlot.mlAnalysisResults.component_results?.drone?.agb_mg_ha?.toFixed(
                          1
                        )}
                      </Text>
                      <Text style={styles.mlSmallCardSubtext}>
                        Confidence:{" "}
                        {(
                          (selectedPlot.mlAnalysisResults.component_results
                            ?.drone?.confidence || 0) * 100
                        ).toFixed(0)}
                        %
                      </Text>
                    </View>
                  </View>

                  <View style={styles.mlMetadataCard}>
                    <Text style={styles.mlMetadataText}>
                      Job ID: {selectedPlot.mlAnalysisResults.job_id || "N/A"}
                    </Text>
                    <Text style={styles.mlMetadataText}>
                      Processing Time:{" "}
                      {selectedPlot.mlAnalysisResults.processing_time_seconds ||
                        "N/A"}
                      s
                    </Text>
                    <Text style={styles.mlMetadataText}>
                      Study Area:{" "}
                      {selectedPlot.mlAnalysisResults.final_results
                        ?.study_area_ha || "N/A"}{" "}
                      ha
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.mlCloseButton}
                    onPress={() => setMlResultsModalVisible(false)}
                  >
                    <Text style={styles.mlCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Approval Notes Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={approvalNotesModalVisible}
        onRequestClose={() => setApprovalNotesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notesModalContent}>
            <View style={styles.notesModalHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              <Text style={styles.notesModalTitle}>Approve Plot</Text>
            </View>

            <Text style={styles.notesModalSubtitle}>
              {selectedPlot?.title}
            </Text>

            <Text style={styles.notesLabel}>Approval Notes:</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add approval notes and observations..."
              placeholderTextColor="#94a3b8"
              value={approvalNotes}
              onChangeText={setApprovalNotes}
              multiline
              numberOfLines={6}
            />

            <View style={styles.notesModalActions}>
              <TouchableOpacity
                style={styles.notesCancelButton}
                onPress={() => setApprovalNotesModalVisible(false)}
              >
                <Text style={styles.notesCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notesApproveButton}
                onPress={handleApprove}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.notesApproveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rejection Notes Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={rejectionNotesModalVisible}
        onRequestClose={() => setRejectionNotesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notesModalContent}>
            <View style={styles.notesModalHeader}>
              <Ionicons name="close-circle" size={32} color="#ef4444" />
              <Text style={styles.notesModalTitle}>Reject Plot</Text>
            </View>

            <Text style={styles.notesModalSubtitle}>
              {selectedPlot?.title}
            </Text>

            <Text style={styles.notesLabel}>Rejection Reason:</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Explain why this plot is being rejected..."
              placeholderTextColor="#94a3b8"
              value={rejectionNotes}
              onChangeText={setRejectionNotes}
              multiline
              numberOfLines={6}
            />

            <View style={styles.notesModalActions}>
              <TouchableOpacity
                style={styles.notesCancelButton}
                onPress={() => setRejectionNotesModalVisible(false)}
              >
                <Text style={styles.notesCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notesRejectButton}
                onPress={handleReject}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.notesRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: selectedImage }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  webScrollContainer: {
    height: "100vh",
    overflowY: "auto",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 100,
  },
  noPlots: {
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
    fontSize: 18,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginLeft: 10,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
    textTransform: "capitalize",
  },
  cardContent: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#475569",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  verifiedText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#10b981",
    fontWeight: "600",
  },
  mlBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  mlText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#4A90E2",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5A7FE2",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  detailsButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
  },
  mlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  mlButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  reviewButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
    fontSize: 13,
  },
  adminActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  approveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
  },
  approveText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
  },
  rejectText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: height * 0.9,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: "#1e293b",
  },
  verificationContainer: {
    marginBottom: 20,
  },
  verificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  verificationStatus: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
  },
  verificationNotes: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  imagesContainer: {
    marginBottom: 20,
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 10,
  },
  mlPreviewContainer: {
    marginBottom: 20,
  },
  mlPreviewCard: {
    backgroundColor: "#e0f2fe",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  mlPreviewLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  mlPreviewValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  viewFullResultsButton: {
    backgroundColor: "#4A90E2",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  viewFullResultsText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalAdminActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalApproveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  modalApproveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalRejectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  modalRejectText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  mlModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    maxHeight: height * 0.8,
    width: width * 0.9,
    alignSelf: "center",
    padding: 25,
  },
  mlResultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  mlResultsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
  },
  mlCard: {
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  mlCardTitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 8,
  },
  mlCardValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10b981",
  },
  mlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mlHalfCard: {
    width: "48%",
  },
  mlSmallCardTitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 5,
  },
  mlSmallCardValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  mlSmallCardSubtext: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 5,
  },
  mlMetadataCard: {
    backgroundColor: "#e0f2fe",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  mlMetadataText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 5,
  },
  mlCloseButton: {
    backgroundColor: "#4A90E2",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  mlCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  notesModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: width * 0.9,
    alignSelf: "center",
    padding: 25,
    maxHeight: height * 0.7,
  },
  notesModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  notesModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginLeft: 12,
  },
  notesModalSubtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 10,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#1e293b",
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  notesModalActions: {
    flexDirection: "row",
    gap: 10,
  },
  notesCancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  notesCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  notesApproveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 15,
    borderRadius: 12,
  },
  notesApproveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  notesRejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 15,
    borderRadius: 12,
  },
  notesRejectText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },
});
