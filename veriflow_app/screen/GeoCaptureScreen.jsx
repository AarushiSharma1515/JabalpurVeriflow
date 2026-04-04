import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";

export default function GeoTagLocation() {
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Request location permission + start tracking
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Location permission is required");
        return;
      }

      // Real-time location tracking
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          setLocation({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
          });
        }
      );
    })();
  }, []);

  if (!permission) return <View />;
  if (!permission.granted)
    return (
      <View style={styles.center}>
        <Text>Camera permission needed</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );

  // 📸 Capture Image
  const takePhoto = async () => {
    if (cameraRef.current && photos.length < 4) {
      let photo = await cameraRef.current.takePictureAsync();

      // Save to device storage
      const dest = FileSystem.documentDirectory + `photo_${Date.now()}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });

      setPhotos([...photos, dest]);
    }
  };

  // 🟩 Simulated Upload → Reset Everything
  const fakeUpload = () => {
    setIsUploading(true);

    setTimeout(() => {
      // Reset screen states
      setPhotos([]);
      setIsUploading(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView style={styles.camera} ref={cameraRef} />

      {/* Live Coordinates */}
      <View style={styles.coords}>
        <Text style={styles.coordsText}>
          Lat: {location?.lat?.toFixed(6) || "..."}
        </Text>
        <Text style={styles.coordsText}>
          Lon: {location?.lon?.toFixed(6) || "..."}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.bottomControls}>
        {photos.length < 4 ? (
          <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
            <Text style={styles.btnText}>Capture {photos.length}/4</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.uploadBtn} onPress={fakeUpload}>
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Upload</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Photo previews */}
      <View style={styles.previewBox}>
        {photos.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.previewImg} />
        ))}
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  coords: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    borderRadius: 8,
  },
  coordsText: { color: "#fff", fontSize: 14 },
  bottomControls: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
  },
  captureBtn: {
    backgroundColor: "#0066ff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  uploadBtn: {
    backgroundColor: "green",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontSize: 18 },
  previewBox: {
    position: "absolute",
    bottom: 120,
    flexDirection: "row",
    paddingHorizontal: 10,
    width: "100%",
  },
  previewImg: {
    width: 70,
    height: 70,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fff",
  },
});
