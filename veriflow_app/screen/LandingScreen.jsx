// import React from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   SafeAreaView,
//   Dimensions,
//   Image,
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useNavigation } from '@react-navigation/native';

// const { width, height } = Dimensions.get('window');

// export default function LandingScreen() {
//   const navigation = useNavigation();

//   return (
//     <LinearGradient
//       colors={['#4A90E2', '#7B68EE']}
//       style={styles.gradient}
//       start={{ x: 0, y: 0 }}
//       end={{ x: 1, y: 1 }}
//     >
//       <SafeAreaView style={styles.container}>
//         <View style={styles.content}>
//           <View style={styles.logoContainer}>
//             <Image
//               source={require('../assets/veriflow-logo.png')}
//               style={styles.logo}
//               resizeMode="contain"
//             />
//             <Text style={styles.tagline}>Verify. Streamline. Trust.</Text>
//           </View>

//           <View style={styles.buttonContainer}>
//             <TouchableOpacity
//               style={styles.button}
//               onPress={() => navigation.navigate('Login')} // Changed to Login
//               activeOpacity={0.8}
//             >
//               <Text style={styles.buttonText}>Get Started</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
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
//   content: {
//     flex: 1,
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: height * 0.1,
//     paddingHorizontal: 20,
//   },
//   logoContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   logo: {
//     width: width * 0.7,
//     height: 180,
//     marginBottom: 16,
//   },
//   tagline: {
//     fontSize: 18,
//     color: '#FFFFFF',
//     opacity: 0.9,
//     letterSpacing: 0.5,
//   },
//   buttonContainer: {
//     width: '100%',
//     alignItems: 'center',
//     gap: 16,
//   },
//   button: {
//     backgroundColor: '#FFFFFF',
//     paddingVertical: 16,
//     paddingHorizontal: 60,
//     borderRadius: 30,
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 4.65,
//     elevation: 8,
//     minWidth: width * 0.7,
//     alignItems: 'center',
//   },
//   buttonText: {
//     color: '#5A7FE2',
//     fontSize: 18,
//     fontWeight: '600',
//     letterSpacing: 0.5,
//   },
// });

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

export default function LandingScreen() {
  const navigation = useNavigation();

  return (
    <LinearGradient
      colors={['#ffffff', '#ffffff']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/veriflow-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Verify. Streamline. Trust.</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Login')} // Changed to Login
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Get Started</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: 180,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#000000',
    opacity: 0.95,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    backgroundColor: '#49af49',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    minWidth: width * 0.7,
    alignItems: 'center',
  },
  buttonText: {
    color: '#163516',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});