// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   Platform,
//   Alert,
// } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { useNavigation } from "@react-navigation/native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import projectsService from "../services/projectsService";
// import DateTimePicker from "@react-native-community/datetimepicker";

// export default function PlotRegistrationScreen() {
//   const navigation = useNavigation();

//   // Form states
//   const [plotName, setPlotName] = useState("");
//   const [area, setArea] = useState("");
//   const [species, setSpecies] = useState("");
//   const [remarks, setRemarks] = useState("");

//   // Date picker states
//   const [plantingDate, setPlantingDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);

//   // Loading state
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleDateChange = (event, selectedDate) => {
//     const currentDate = selectedDate || plantingDate;
//     setShowDatePicker(false);
//     setPlantingDate(currentDate);
//   };

//   const handleSubmit = async () => {
//     // Prevent double submissions
//     if (isSubmitting) {
//       return;
//     }

//     // Basic validation
//     if (!plotName || !area) {
//       Alert.alert('Validation', 'Please provide plot name and area');
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const token = await AsyncStorage.getItem('token');

//       if (!token) {
//         Alert.alert('Error', 'Authentication token not found. Please login again.');
//         setIsSubmitting(false);
//         return;
//       }

//       const payload = {
//         title: plotName,
//         description: remarks,
//         areaHectares: Number(area),
//         cropType: species,
//         metadata: { species },
//         startDate: plantingDate.toISOString(),
//       };

//       console.log('Submitting project', payload);
//       console.log('API URL:', `${projectsService.API_BASE ?? 'undefined'}/api/projects`);

//       const resp = await projectsService.createProject(token, payload);
//       console.log('Project created', resp);
//       Alert.alert('Success', 'Plot registered successfully');
//       navigation.goBack();
//     } catch (err) {
//       console.error('Project creation error:', err);
//       console.error('Error details:', JSON.stringify(err, null, 2));

//       let msg = 'Failed to create project';

//       if (err?.response) {
//         // Server responded with error
//         msg = err.response.data?.message ?? `Server error: ${err.response.status}`;
//         console.error('Server response:', err.response.data);
//       } else if (err?.request) {
//         // Request made but no response received
//         msg = 'Network error: Could not reach server. Please check your internet connection.';
//         console.error('Network error - no response received');
//       } else if (err?.message) {
//         msg = err.message;
//       }

//       Alert.alert('Error', msg);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <LinearGradient colors={["#0f4d92", "#0fa3b1", "#3bd27a"]} style={styles.container}>
//       <ScrollView contentContainerStyle={styles.innerContainer}>
//         <Text style={styles.title}>Register New Plot</Text>

//         {/* Plot Name */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Plot Name</Text>
//           <TextInput
//             style={styles.input}
//             placeholder="Enter Plot Name"
//             value={plotName}
//             onChangeText={setPlotName}
//           />
//         </View>

//         {/* Area */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Area (in hectares)</Text>
//           <TextInput
//             style={styles.input}
//             placeholder="Enter Area"
//             keyboardType="numeric"
//             value={area}
//             onChangeText={setArea}
//           />
//         </View>

//         {/* Species */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Species</Text>
//           <TextInput
//             style={styles.input}
//             placeholder="Enter Species"
//             value={species}
//             onChangeText={setSpecies}
//           />
//         </View>

//         {/* Date Picker */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Date of Planting / Survey</Text>

//           <TouchableOpacity
//             style={styles.dateButton}
//             onPress={() => setShowDatePicker(true)}
//           >
//             <Text style={styles.dateButtonText}>
//               {plantingDate.toLocaleDateString()}
//             </Text>
//           </TouchableOpacity>

//           {/* Web Date Picker */}
//           {Platform.OS === "web" && showDatePicker && (
//             <input
//               type="date"
//               value={plantingDate.toISOString().split("T")[0]}
//               onChange={(e) => {
//                 setPlantingDate(new Date(e.target.value));
//                 setShowDatePicker(false);
//               }}
//               style={styles.webDateInput}
//             />
//           )}

//           {/* Android + iOS Date Picker */}
//           {Platform.OS !== "web" && showDatePicker && (
//             <DateTimePicker
//               value={plantingDate}
//               mode="date"
//               display={Platform.OS === "ios" ? "spinner" : "default"}
//               onChange={handleDateChange}
//             />
//           )}
//         </View>

//         {/* Remarks */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Remarks</Text>
//           <TextInput
//             style={[styles.input, { height: 100 }]}
//             placeholder="Additional Notes"
//             value={remarks}
//             onChangeText={setRemarks}
//             multiline
//           />
//         </View>

//         {/* Submit */}
//         <TouchableOpacity
//           style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
//           onPress={handleSubmit}
//           disabled={isSubmitting}
//         >
//           <Text style={styles.submitButtonText}>
//             {isSubmitting ? "Submitting..." : "Submit"}
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   innerContainer: {
//     padding: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 20,
//     textAlign: "center",
//   },
//   inputGroup: {
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 16,
//     color: "#fff",
//     marginBottom: 6,
//   },
//   input: {
//     backgroundColor: "rgba(255,255,255,0.9)",
//     borderRadius: 10,
//     padding: 12,
//     fontSize: 16,
//   },
//   dateButton: {
//     backgroundColor: "rgba(255,255,255,0.9)",
//     borderRadius: 10,
//     padding: 12,
//   },
//   dateButtonText: {
//     fontSize: 16,
//     color: "#000",
//   },
//   webDateInput: {
//     padding: 12,
//     marginTop: 10,
//     borderRadius: 10,
//     border: "1px solid #ccc",
//     fontSize: 16,
//   },
//   submitButton: {
//     backgroundColor: "#004aad",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginTop: 10,
//   },
//   submitButtonDisabled: {
//     backgroundColor: "#6c757d",
//     opacity: 0.6,
//   },
//   submitButtonText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "bold",
//   },
// });

// import React, { useState } from "react";
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   Platform,
//   Alert,
//   Modal,
//   TouchableWithoutFeedback,
// } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { useNavigation } from "@react-navigation/native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import projectsService from "../services/projectsService";
// import DateTimePicker from "@react-native-community/datetimepicker";

// export default function PlotRegistrationScreen() {
//   const navigation = useNavigation();

//   // Form states
//   const [plotName, setPlotName] = useState("");
//   const [area, setArea] = useState("");
//   const [species, setSpecies] = useState("");
//   const [remarks, setRemarks] = useState("");
//   const [showSpeciesModal, setShowSpeciesModal] = useState(false);

//   // Date picker states
//   const [plantingDate, setPlantingDate] = useState(new Date());
//   const [showDatePicker, setShowDatePicker] = useState(false);

//   // Loading state
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleDateChange = (event, selectedDate) => {
//     const currentDate = selectedDate || plantingDate;
//     setShowDatePicker(false);
//     setPlantingDate(currentDate);
//   };

//   const handleSubmit = async () => {
//     // Prevent double submissions
//     if (isSubmitting) {
//       return;
//     }

//     // Basic validation
//     if (!plotName || !area) {
//       Alert.alert('Validation', 'Please provide plot name and area');
//       return;
//     }

//     setIsSubmitting(true);

//     try {
//       const token = await AsyncStorage.getItem('token');

//       if (!token) {
//         Alert.alert('Error', 'Authentication token not found. Please login again.');
//         setIsSubmitting(false);
//         return;
//       }

//       const payload = {
//         title: plotName,
//         description: remarks,
//         areaHectares: Number(area),
//         cropType: species,
//         metadata: { species },
//         startDate: plantingDate.toISOString(),
//       };

//       console.log('Submitting project', payload);
//       console.log('API URL:', `${projectsService.API_BASE ?? 'undefined'}/api/projects`);

//       const resp = await projectsService.createProject(token, payload);
//       console.log('Project created', resp);
//       Alert.alert('Success', 'Plot registered successfully');
//       navigation.goBack();
//     } catch (err) {
//       console.error('Project creation error:', err);
//       console.error('Error details:', JSON.stringify(err, null, 2));

//       let msg = 'Failed to create project';

//       if (err?.response) {
//         // Server responded with error
//         msg = err.response.data?.message ?? `Server error: ${err.response.status}`;
//         console.error('Server response:', err.response.data);
//       } else if (err?.request) {
//         // Request made but no response received
//         msg = 'Network error: Could not reach server. Please check your internet connection.';
//         console.error('Network error - no response received');
//       } else if (err?.message) {
//         msg = err.message;
//       }

//       Alert.alert('Error', msg);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <LinearGradient colors={["#0f4d92", "#0fa3b1", "#3bd27a"]} style={styles.container}>
//       <ScrollView contentContainerStyle={styles.innerContainer}>
//         <Text style={styles.title}>Register New Plot</Text>

//         {/* Plot Name */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Plot Name</Text>
//           <TextInput
//             style={styles.input}
//             placeholder="Enter Plot Name"
//             value={plotName}
//             onChangeText={setPlotName}
//           />
//         </View>

//         {/* Area */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Area (in hectares)</Text>
//           <TextInput
//             style={styles.input}
//             placeholder="Enter Area"
//             keyboardType="numeric"
//             value={area}
//             onChangeText={setArea}
//           />
//         </View>

//         {/* Species */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Species</Text>
//           <TouchableOpacity
//             style={styles.input}
//             activeOpacity={0.8}
//             onPress={() => setShowSpeciesModal(true)}
//           >
//             <Text style={[styles.inputText, !species && styles.placeholderText]}>
//               {species || "Select Species"}
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {/* Date Picker */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Date of Planting / Survey</Text>

//           <TouchableOpacity
//             style={styles.dateButton}
//             onPress={() => setShowDatePicker(true)}
//           >
//             <Text style={styles.dateButtonText}>
//               {plantingDate.toLocaleDateString()}
//             </Text>
//           </TouchableOpacity>

//           {/* Web Date Picker */}
//           {Platform.OS === "web" && showDatePicker && (
//             <input
//               type="date"
//               value={plantingDate.toISOString().split("T")[0]}
//               onChange={(e) => {
//                 setPlantingDate(new Date(e.target.value));
//                 setShowDatePicker(false);
//               }}
//               style={styles.webDateInput}
//             />
//           )}

//           {/* Android + iOS Date Picker */}
//           {Platform.OS !== "web" && showDatePicker && (
//             <DateTimePicker
//               value={plantingDate}
//               mode="date"
//               display={Platform.OS === "ios" ? "spinner" : "default"}
//               onChange={handleDateChange}
//             />
//           )}
//         </View>

//         {/* Remarks */}
//         <View style={styles.inputGroup}>
//           <Text style={styles.label}>Remarks</Text>
//           <TextInput
//             style={[styles.input, { height: 100 }]}
//             placeholder="Additional Notes"
//             value={remarks}
//             onChangeText={setRemarks}
//             multiline
//           />
//         </View>

//         {/* Submit */}
//         <TouchableOpacity
//           style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
//           onPress={handleSubmit}
//           disabled={isSubmitting}
//         >
//           <Text style={styles.submitButtonText}>
//             {isSubmitting ? "Submitting..." : "Submit"}
//           </Text>
//         </TouchableOpacity>
//       </ScrollView>

//       <Modal
//         visible={showSpeciesModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowSpeciesModal(false)}
//       >
//         <TouchableWithoutFeedback onPress={() => setShowSpeciesModal(false)}>
//           <View style={styles.modalOverlay} />
//         </TouchableWithoutFeedback>
//         <View style={styles.modalContainer}>
//           <Text style={styles.modalTitle}>Select Species</Text>
//           {["Saltmarsh", "Mangrove"].map((option) => (
//             <TouchableOpacity
//               key={option}
//               style={styles.modalOption}
//               onPress={() => {
//                 setSpecies(option);
//                 setShowSpeciesModal(false);
//               }}
//             >
//               <Text style={styles.modalOptionText}>{option}</Text>
//             </TouchableOpacity>
//           ))}
//           <TouchableOpacity
//             style={[styles.modalOption, styles.modalCancel]}
//             onPress={() => setShowSpeciesModal(false)}
//           >
//             <Text style={[styles.modalOptionText, styles.modalCancelText]}>Cancel</Text>
//           </TouchableOpacity>
//         </View>
//       </Modal>
//     </LinearGradient>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   innerContainer: {
//     padding: 20,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: "bold",
//     color: "#fff",
//     marginBottom: 20,
//     textAlign: "center",
//   },
//   inputGroup: {
//     marginBottom: 20,
//   },
//   label: {
//     fontSize: 16,
//     color: "#fff",
//     marginBottom: 6,
//   },
//   input: {
//     backgroundColor: "rgba(255,255,255,0.9)",
//     borderRadius: 10,
//     padding: 12,
//     fontSize: 16,
//   },
//   inputText: {
//     fontSize: 16,
//     color: "#000",
//   },
//   placeholderText: {
//     color: "#9CA3AF",
//   },
//   dateButton: {
//     backgroundColor: "rgba(255,255,255,0.9)",
//     borderRadius: 10,
//     padding: 12,
//   },
//   dateButtonText: {
//     fontSize: 16,
//     color: "#000",
//   },
//   webDateInput: {
//     padding: 12,
//     marginTop: 10,
//     borderRadius: 10,
//     border: "1px solid #ccc",
//     fontSize: 16,
//   },
//   submitButton: {
//     backgroundColor: "#004aad",
//     padding: 15,
//     borderRadius: 12,
//     alignItems: "center",
//     marginTop: 10,
//   },
//   submitButtonDisabled: {
//     backgroundColor: "#6c757d",
//     opacity: 0.6,
//   },
//   submitButtonText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "bold",
//   },
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//   },
//   modalContainer: {
//     position: "absolute",
//     left: 20,
//     right: 20,
//     bottom: 40,
//     backgroundColor: "#FFFFFF",
//     borderRadius: 12,
//     paddingVertical: 10,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 10,
//   },
//   modalTitle: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: "#0f4d92",
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//   },
//   modalOption: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     borderTopWidth: 1,
//     borderTopColor: "rgba(0,0,0,0.05)",
//   },
//   modalOptionText: {
//     fontSize: 16,
//     color: "#000",
//   },
//   modalCancel: {
//     backgroundColor: "rgba(15, 163, 177, 0.08)",
//     borderBottomLeftRadius: 12,
//     borderBottomRightRadius: 12,
//   },
//   modalCancelText: {
//     color: "#0fa3b1",
//     fontWeight: "700",
//   },
// });

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import projectsService from "../services/projectsService";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function PlotRegistrationScreen() {
  const navigation = useNavigation();

  // Form states
  const [plotName, setPlotName] = useState("");
  const [area, setArea] = useState("");
  const [species, setSpecies] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showSpeciesModal, setShowSpeciesModal] = useState(false);

  // Date picker states
  const [plantingDate, setPlantingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || plantingDate;
    setShowDatePicker(false);
    setPlantingDate(currentDate);
  };

  const handleSubmit = async () => {
    // Prevent double submissions
    if (isSubmitting) {
      return;
    }

    // Basic validation
    if (!plotName || !area) {
      Alert.alert('Validation', 'Please provide plot name and area');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        title: plotName,
        description: remarks,
        areaHectares: Number(area),
        cropType: species,
        metadata: { species },
        startDate: plantingDate.toISOString(),
      };

      console.log('Submitting project', payload);
      console.log('API URL:', `${projectsService.API_BASE ?? 'undefined'}/api/projects`);

      const resp = await projectsService.createProject(payload, token);
      console.log('Project created', resp);
      Alert.alert('Success', 'Plot registered successfully');
      navigation.goBack();
    } catch (err) {
      console.error('Project creation error:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));

      let msg = 'Failed to create project';

      if (err?.response) {
        // Server responded with error
        msg = err.response.data?.message ?? `Server error: ${err.response.status}`;
        console.error('Server response:', err.response.data);
      } else if (err?.request) {
        // Request made but no response received
        msg = 'Network error: Could not reach server. Please check your internet connection.';
        console.error('Network error - no response received');
      } else if (err?.message) {
        msg = err.message;
      }

      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={["#0d1f0d", "#0f2a0f"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.innerContainer}>
        <Text style={styles.title}>Register New Plot</Text>

        {/* Plot Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Plot Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Plot Name"
            placeholderTextColor="#aaaaaa"
            value={plotName}
            onChangeText={setPlotName}
          />
        </View>

        {/* Area */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Area (in hectares)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Area"
            placeholderTextColor="#aaaaaa"
            keyboardType="numeric"
            value={area}
            onChangeText={setArea}
          />
        </View>

        {/* Species */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Species</Text>
          <TouchableOpacity
            style={styles.input}
            activeOpacity={0.8}
            onPress={() => setShowSpeciesModal(true)}
          >
            <Text style={[styles.inputText, !species && styles.placeholderText]}>
              {species || "Select Species"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date of Planting / Survey</Text>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {plantingDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {/* Web Date Picker */}
          {Platform.OS === "web" && showDatePicker && (
            <input
              type="date"
              value={plantingDate.toISOString().split("T")[0]}
              onChange={(e) => {
                setPlantingDate(new Date(e.target.value));
                setShowDatePicker(false);
              }}
              style={styles.webDateInput}
            />
          )}

          {/* Android + iOS Date Picker */}
          {Platform.OS !== "web" && showDatePicker && (
            <DateTimePicker
              value={plantingDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Remarks */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Additional Notes"
            placeholderTextColor="#aaaaaa"
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showSpeciesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpeciesModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSpeciesModal(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Species</Text>
          {["Saltmarsh", "Mangrove"].map((option) => (
            <TouchableOpacity
              key={option}
              style={styles.modalOption}
              onPress={() => {
                setSpecies(option);
                setShowSpeciesModal(false);
              }}
            >
              <Text style={styles.modalOptionText}>{option}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.modalOption, styles.modalCancel]}
            onPress={() => setShowSpeciesModal(false)}
          >
            <Text style={[styles.modalOptionText, styles.modalCancelText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1a2e1a",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  inputText: {
    fontSize: 16,
    color: "#ffffff",
  },
  placeholderText: {
    color: "#aaaaaa",
  },
  dateButton: {
    backgroundColor: "#1a2e1a",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#ffffff",
  },
  webDateInput: {
    padding: 12,
    marginTop: 10,
    borderRadius: 12,
    border: "1px solid #2a3e2a",
    fontSize: 16,
    backgroundColor: "#1a2e1a",
    color: "#ffffff",
  },
  submitButton: {
    backgroundColor: "#4dff4d",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#6c757d",
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#0d1f0d",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: "#0d1f0d",
    borderRadius: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a3e2a",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#ffffff",
  },
  modalCancel: {
    backgroundColor: "#1a2e1a",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  modalCancelText: {
    color: "#4dff4d",
    fontWeight: "700",
  },
});