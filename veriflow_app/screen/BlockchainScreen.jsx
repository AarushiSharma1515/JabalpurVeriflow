import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import blockchainService from '../services/blockchainService';

const BlockchainScreen = ({ route, navigation }) => {
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [preparingMetadata, setPreparingMetadata] = useState(false);
  const [mintingData, setMintingData] = useState(null);

  // Get data from navigation params
  const {
    project,
    mlResults,
    walletAddress = null,
    imageUri = null,
  } = route.params || {};

  // Validate required data
  useEffect(() => {
    if (!project || !mlResults) {
      Alert.alert(
        'Missing Data',
        'Project or ML results not found. Please run ML verification first.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    } else {
      // Prepare minting data when component mounts
      prepareMintingData();
    }
  }, []);

  /**
   * Prepare NFT metadata and upload to IPFS
   */
  const prepareMintingData = async () => {
    try {
      setPreparingMetadata(true);
      console.log('Preparing NFT metadata for minting...');

      // Call blockchain service to create metadata and upload to IPFS
      const result = await blockchainService.mintCarbonCreditNFT(
        project,
        mlResults,
        walletAddress,
        imageUri
      );

      console.log('Minting data prepared:', result);
      setMintingData(result);
    } catch (error) {
      console.error('Error preparing metadata:', error);
      Alert.alert(
        'Metadata Error',
        'Failed to prepare NFT metadata. Please try again.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    } finally {
      setPreparingMetadata(false);
    }
  };

  // URL to the hosted HTML minter
  // Replace with your deployed HTML URL
  const uri = 'https://plum-lorne-2.tiiny.site';

  /**
   * Mock wallet injection for WebView
   * This provides window.ethereum to the HTML page
   */
  const MOCK_WALLET_SCRIPT = `
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method, params }) => {
        console.log("Mock Wallet Call:", method);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (method === 'eth_requestAccounts') {
          return ['0x71C7656EC7ab88b098defB751B7401B5f6d8976F'];
        }

        if (method === 'eth_chainId') {
          return '0x13882'; // Polygon Amoy
        }

        if (method === 'eth_estimateGas') {
          return '0x5208';
        }

        if (method === 'eth_sendTransaction') {
          // Return a random fake Transaction Hash
          return '0x' + Array(64).fill('0').map(() =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('');
        }

        return null;
      }
    };
    true; // Required for React Native WebView injection
  `;

  /**
   * Inject project and minting data into WebView
   */
  const injectProjectData = () => {
    if (!mintingData || !project || !mlResults) return;

    const carbonKg = mlResults.final_results?.carbon_sequestration_kg || 0;
    const carbonTons = blockchainService.kgToTons(carbonKg);

    const data = {
      type: 'SET_CO2_DATA',
      projectId: project._id,
      projectName: project.title || 'Carbon Credit Project',
      co2Value: carbonKg.toFixed(2),
      co2Tons: carbonTons.toFixed(4),

      // Additional blockchain data
      metadataURI: mintingData.metadataURI,
      contractAddress: mintingData.contractAddress,
      carbonAmount: mintingData.carbonAmount,
      price: mintingData.price.toFixed(4),

      // Project details
      location: project.location,
      areaHectares: project.areaHectares,
      cropType: project.cropType,

      // ML confidence scores
      satelliteConfidence: mlResults.component_results?.satellite?.confidence || 0,
      droneConfidence: mlResults.component_results?.drone?.confidence || 0,
    };

    // Post message to WebView
    const script = `
      setTimeout(function() {
        window.postMessage(JSON.stringify(${JSON.stringify(data)}), '*');
      }, 500);
      true;
    `;

    webViewRef.current?.injectJavaScript(script);
  };

  /**
   * Handle messages from WebView
   */
  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'MINT_SUCCESS') {
        // NFT minting succeeded
        console.log('Mint success:', message);

        // Wait for HTML animation to complete
        setTimeout(() => {
          Alert.alert(
            '🎉 Minting Complete',
            `Carbon Credit NFT #${message.tokenId || '001'} has been generated on Polygon Amoy.\n\n` +
            `Project: ${project.title}\n` +
            `Carbon: ${blockchainService.kgToTons(mlResults.final_results?.carbon_sequestration_kg || 0).toFixed(2)} tons CO2\n\n` +
            `Tx: ${message.txHash?.slice(0, 10)}...`,
            [
              {
                text: 'View on Explorer',
                onPress: () => {
                  // TODO: Open blockchain explorer
                  console.log('Open explorer:', message.explorerUrl);
                },
              },
              {
                text: 'Done',
                onPress: () => navigation.navigate('HomeScreen'),
              },
            ]
          );
        }, 1000);
      }

      if (message.type === 'MINT_ERROR') {
        console.error('Minting error:', message.error);
        Alert.alert(
          'Minting Failed',
          message.error || 'Failed to mint NFT. Please try again.',
          [{ text: 'OK' }]
        );
      }

      if (message.type === 'WALLET_CONNECTED') {
        console.log('Wallet connected:', message.account);
      }

      if (message.type === 'PAGE_LOADED') {
        console.log('WebView page loaded');
      }
    } catch (e) {
      console.log('Message Parse Error:', e);
    }
  };

  /**
   * Render loading state while preparing metadata
   */
  if (preparingMetadata) {
    return (
      <View style={styles.preparingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.preparingText}>Uploading to IPFS...</Text>
        <Text style={styles.preparingSubtext}>
          Creating NFT metadata and uploading to Pinata
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Connecting to Polygon...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: uri }}
        onMessage={handleMessage}
        onLoadEnd={() => {
          setLoading(false);
          injectProjectData();
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
        }}
        // Inject wallet BEFORE page loads
        injectedJavaScriptBeforeContentLoaded={MOCK_WALLET_SCRIPT}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        setSupportMultipleWindows={false}
        style={{ flex: 1, opacity: loading ? 0 : 1 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    color: '#333',
    fontSize: 16,
  },
  preparingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  preparingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  preparingSubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default BlockchainScreen;
