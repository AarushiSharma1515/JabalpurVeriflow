import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function RecordFieldDataScreen() {
  const navigation = useNavigation();

  const handleSatellitePress = () => {
    console.log('Satellite button pressed');
    // Add your navigation or functionality here
  };

  const handleDronePress = () => {
    console.log('Drone button pressed');
    // Add your navigation or functionality here
  };

  return (
    <LinearGradient
      colors={['#4A90E2', '#7B68EE']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Satellite Button */}
            <TouchableOpacity
              style={styles.bigButton}
              onPress={handleSatellitePress}
              activeOpacity={0.8}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={require('../assets/satellite.png')}
                  style={styles.buttonImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.buttonLabel}>Satellite</Text>
            </TouchableOpacity>

            {/* Drone Button */}
            <TouchableOpacity
              style={styles.bigButton}
              onPress={handleDronePress}
              activeOpacity={0.8}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={require('../assets/drone.png')}
                  style={styles.buttonImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.buttonLabel}>Drone</Text>
            </TouchableOpacity>

          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginBottom: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    gap: 30,
  },
  bigButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: width * 0.85,
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6.68,
    elevation: 11,
    padding: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonImage: {
    width: '80%',
    height: '80%',
  },
  buttonLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5A7FE2',
    marginTop: 12,
    letterSpacing: 0.5,
  },
});