import axios from 'axios';
import { ethers } from 'ethers';

/**
 * ===== BLOCKCHAIN CONFIGURATION =====
 * Polygon Amoy Testnet Configuration
 */
const POLYGON_AMOY_CONFIG = {
  chainId: '0x13882', // 80002 in decimal
  chainName: 'Polygon Amoy Testnet',
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  blockExplorerUrl: 'https://amoy.polygonscan.com/',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
};

/**
 * ===== PINATA IPFS CONFIGURATION =====
 */
const PINATA_CONFIG = {
  apiKey: '86e920e26cad8ea4f7bd',
  apiSecret: 'eaa7d5d783680c0be067635cf2a09bb9ad3562c16795b8c9c04ea328bb2065ec',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlZDllZThkNi01MmE3LTQwZWEtOGY4Ny03NWZmZGU4NWY1MTQiLCJlbWFpbCI6InNob3VyeWFwYWwyODAzQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6IkZSQTEifSx7ImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxLCJpZCI6Ik5ZQzEifV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI4NmU5MjBlMjZjYWQ4ZWE0ZjdiZCIsInNjb3BlZEtleVNlY3JldCI6ImVhYTdkNWQ3ODM2ODBjMGJlMDY3NjM1Y2YyYTA5YmI5YWQzNTYyYzE2Nzk1YjhjOWMwNGVhMzI4YmIyMDY1ZWMiLCJleHAiOjE3OTY3OTQ0NzF9.gcth8oZpK7dMr1GV2oCwz8DUqfb_c2OA0vfp9noajQc',
  pinataApiUrl: 'https://api.pinata.cloud',
  pinataGatewayUrl: 'https://gateway.pinata.cloud/ipfs/',
};

/**
 * ===== CARBON CREDIT SMART CONTRACT =====
 * Deploy this contract to Polygon Amoy and update the address below
 *
 * Contract features:
 * - ERC-721 NFT standard for carbon credits
 * - Each token represents carbon sequestration amount
 * - Project ID mapped to token for traceability
 * - Metadata stored on IPFS via Pinata
 */
const CARBON_CREDIT_CONTRACT = {
  // Deployed Contract Address on Polygon Amoy
  address: '0x85FF485d027b23D7CB41DA30FDBcdE3Df31EB33E',

  // Simplified ABI - Essential functions only
  abi: [
    {
      "inputs": [
        {"name": "to", "type": "address"},
        {"name": "projectId", "type": "string"},
        {"name": "carbonAmount", "type": "uint256"},
        {"name": "metadataURI", "type": "string"}
      ],
      "name": "mintCarbonCredit",
      "outputs": [{"name": "tokenId", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"name": "tokenId", "type": "uint256"}],
      "name": "tokenURI",
      "outputs": [{"name": "", "type": "string"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "owner", "type": "address"}],
      "name": "tokensOfOwner",
      "outputs": [{"name": "", "type": "uint256[]"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "projectId", "type": "string"}],
      "name": "getTokenByProjectId",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"name": "tokenId", "type": "uint256"}],
      "name": "getCarbonAmount",
      "outputs": [{"name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "name": "tokenId", "type": "uint256"},
        {"indexed": false, "name": "projectId", "type": "string"},
        {"indexed": false, "name": "carbonAmount", "type": "uint256"},
        {"indexed": true, "name": "owner", "type": "address"}
      ],
      "name": "CarbonCreditMinted",
      "type": "event"
    }
  ],
};

/**
 * ===== CARBON CREDIT PRICING =====
 * Fixed pricing to avoid dynamic inflation
 * Price per ton of CO2 equivalent
 */
const CARBON_CREDIT_PRICING = {
  pricePerTonUSD: 50, // $50 per ton of CO2
  pricePerTonMATIC: 0.02, // 0.02 MATIC per ton (adjustable based on market)
};

/**
 * ===== UTILITY FUNCTIONS =====
 */

/**
 * Convert kg to tons
 */
const kgToTons = (kg) => {
  return kg / 1000;
};

/**
 * Convert kg to Wei (for blockchain storage)
 * 1 kg = 1e18 wei (using 18 decimals like ETH)
 */
const kgToWei = (kg) => {
  return ethers.utils.parseUnits(kg.toString(), 18);
};

/**
 * Convert Wei to kg
 */
const weiToKg = (wei) => {
  return parseFloat(ethers.utils.formatUnits(wei, 18));
};

/**
 * Calculate carbon credit price in MATIC
 */
const calculateCarbonCreditPrice = (carbonKg) => {
  const tons = kgToTons(carbonKg);
  return tons * CARBON_CREDIT_PRICING.pricePerTonMATIC;
};

/**
 * Generate CID (IPFS hash) from project ID
 * This creates a deterministic identifier based on project_id
 */
const generateCIDFromProjectId = (projectId) => {
  // Create a deterministic hash from project ID
  // In a real implementation, this would be the actual IPFS CID after upload
  return `Qm${projectId.replace(/[^a-zA-Z0-9]/g, '').padEnd(44, '0').slice(0, 44)}`;
};

/**
 * ===== IPFS / PINATA FUNCTIONS =====
 */

/**
 * Upload JSON metadata to Pinata IPFS
 * Returns IPFS hash (CID)
 */
const uploadMetadataToPinata = async (metadata) => {
  try {
    const url = `${PINATA_CONFIG.pinataApiUrl}/pinning/pinJSONToIPFS`;

    const response = await axios.post(
      url,
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: `Carbon-Credit-${metadata.projectId}`,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error) {
    console.error('Pinata Upload Error:', error.response?.data || error.message);
    throw new Error('Failed to upload metadata to IPFS');
  }
};

/**
 * Upload image to Pinata IPFS
 * Returns IPFS hash (CID)
 */
const uploadImageToPinata = async (imageUri, fileName) => {
  try {
    const formData = new FormData();

    // Append image file
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: fileName || 'carbon-credit-image.jpg',
    });

    const metadata = JSON.stringify({
      name: fileName || 'carbon-credit-image.jpg',
    });
    formData.append('pinataMetadata', metadata);

    const url = `${PINATA_CONFIG.pinataApiUrl}/pinning/pinFileToIPFS`;

    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${PINATA_CONFIG.jwt}`,
      },
    });

    return response.data.IpfsHash;
  } catch (error) {
    console.error('Pinata Image Upload Error:', error.response?.data || error.message);
    throw new Error('Failed to upload image to IPFS');
  }
};

/**
 * Fetch metadata from IPFS via Pinata Gateway
 */
const fetchMetadataFromIPFS = async (ipfsHash) => {
  try {
    const url = `${PINATA_CONFIG.pinataGatewayUrl}${ipfsHash}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('IPFS Fetch Error:', error);
    throw new Error('Failed to fetch metadata from IPFS');
  }
};

/**
 * ===== NFT METADATA GENERATION =====
 */

/**
 * Create NFT metadata from ML verification results
 * Follows ERC-721 metadata standard
 */
const createNFTMetadata = async (project, mlResults, imageIpfsHash = null) => {
  const carbonKg = mlResults.final_results?.carbon_sequestration_kg || 0;
  const carbonTons = kgToTons(carbonKg);

  const metadata = {
    // Standard NFT fields
    name: `Carbon Credit #${project._id.slice(-6).toUpperCase()}`,
    description: `Verified carbon credit from ${project.title}. This NFT represents ${carbonTons.toFixed(2)} tons of CO2 sequestered through sustainable forestry and plantation practices.`,

    // Image (use IPFS hash if available, otherwise use placeholder)
    image: imageIpfsHash
      ? `${PINATA_CONFIG.pinataGatewayUrl}${imageIpfsHash}`
      : 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',

    // External URL to view more details
    external_url: `https://veriflow.app/projects/${project._id}`,

    // NFT Attributes
    attributes: [
      {
        trait_type: 'Project ID',
        value: project._id,
      },
      {
        trait_type: 'Project Name',
        value: project.title,
      },
      {
        trait_type: 'Carbon Sequestration (kg)',
        value: carbonKg.toFixed(2),
        display_type: 'number',
      },
      {
        trait_type: 'Carbon Sequestration (tons)',
        value: carbonTons.toFixed(4),
        display_type: 'number',
      },
      {
        trait_type: 'Area (hectares)',
        value: mlResults.final_results?.study_area_ha || project.areaHectares || 0,
        display_type: 'number',
      },
      {
        trait_type: 'Biomass (Mg/ha)',
        value: mlResults.final_results?.agb_Mg_per_ha?.toFixed(2) || '0',
        display_type: 'number',
      },
      {
        trait_type: 'Crop Type',
        value: project.cropType || 'Mixed Forest',
      },
      {
        trait_type: 'Location',
        value: `${project.location?.city || 'Unknown'}, ${project.location?.state || 'Unknown'}`,
      },
      {
        trait_type: 'Verification Date',
        value: new Date().toISOString().split('T')[0],
      },
      {
        trait_type: 'ML Job ID',
        value: mlResults.job_id || 'N/A',
      },
      {
        trait_type: 'Satellite Confidence',
        value: mlResults.component_results?.satellite?.confidence?.toFixed(2) || '0',
        display_type: 'number',
      },
      {
        trait_type: 'Drone Confidence',
        value: mlResults.component_results?.drone?.confidence?.toFixed(2) || '0',
        display_type: 'number',
      },
      {
        trait_type: 'Network',
        value: 'Polygon Amoy',
      },
      {
        trait_type: 'Standard',
        value: 'ERC-721',
      },
      {
        trait_type: 'Price (MATIC)',
        value: calculateCarbonCreditPrice(carbonKg).toFixed(4),
        display_type: 'number',
      },
      {
        trait_type: 'Owner Name',
        value: project.owner?.name || 'Unknown',
      },
      {
        trait_type: 'Owner Email',
        value: project.owner?.email || 'Unknown',
      },
    ],

    // Additional custom fields
    verification: {
      verified: true,
      verificationDate: new Date().toISOString(),
      mlAnalysisJobId: mlResults.job_id,
      processingTime: mlResults.processing_time_seconds,
    },

    // ML Results summary
    mlResults: {
      carbonSequestration: {
        kg: carbonKg,
        tons: carbonTons,
      },
      biomass: {
        agb_Mg_per_ha: mlResults.final_results?.agb_Mg_per_ha,
      },
      studyArea: {
        hectares: mlResults.final_results?.study_area_ha,
      },
      satellite: {
        height_m: mlResults.component_results?.satellite?.height_m,
        confidence: mlResults.component_results?.satellite?.confidence,
        n_points: mlResults.component_results?.satellite?.n_points,
      },
      drone: {
        area_m2: mlResults.component_results?.drone?.area_m2,
        carbon_kg: mlResults.component_results?.drone?.carbon_kg,
        co2_kg: mlResults.component_results?.drone?.co2_kg,
        confidence: mlResults.component_results?.drone?.confidence,
        openness: mlResults.component_results?.drone?.openness,
      },
    },

    // Project details
    projectDetails: {
      id: project._id,
      title: project.title,
      description: project.description,
      areaHectares: project.areaHectares,
      cropType: project.cropType,
      startDate: project.startDate,
      location: project.location,
      owner: {
        id: project.owner?._id,
        name: project.owner?.name,
        email: project.owner?.email,
      },
    },
  };

  return metadata;
};

/**
 * ===== BLOCKCHAIN INTERACTION FUNCTIONS =====
 */

/**
 * Mint a Carbon Credit NFT
 * This is called from the WebView via the BlockchainScreen
 *
 * @param {Object} project - Project data from backend
 * @param {Object} mlResults - ML analysis results
 * @param {String} walletAddress - Connected wallet address
 * @param {String} imageUri - Optional image URI to upload to IPFS
 * @returns {Object} - Minting result with transaction hash and token ID
 */
const mintCarbonCreditNFT = async (project, mlResults, walletAddress, imageUri = null) => {
  try {
    console.log('Starting Carbon Credit NFT Minting Process...');

    // Step 1: Upload image to IPFS (if provided)
    let imageIpfsHash = null;
    if (imageUri) {
      console.log('Uploading image to Pinata IPFS...');
      imageIpfsHash = await uploadImageToPinata(imageUri, `${project._id}-image.jpg`);
      console.log('Image uploaded to IPFS:', imageIpfsHash);
    }

    // Step 2: Create NFT metadata
    console.log('Creating NFT metadata...');
    const metadata = await createNFTMetadata(project, mlResults, imageIpfsHash);

    // Step 3: Upload metadata to IPFS
    console.log('Uploading metadata to Pinata IPFS...');
    const metadataIpfsHash = await uploadMetadataToPinata(metadata);
    console.log('Metadata uploaded to IPFS:', metadataIpfsHash);

    // Step 4: Generate metadata URI
    const metadataURI = `${PINATA_CONFIG.pinataGatewayUrl}${metadataIpfsHash}`;

    // Step 5: Prepare blockchain transaction data
    const carbonKg = mlResults.final_results?.carbon_sequestration_kg || 0;
    const carbonWei = kgToWei(carbonKg);

    // Return data needed for smart contract interaction
    // The actual blockchain transaction will be executed via the WebView
    return {
      success: true,
      metadataURI,
      metadataIpfsHash,
      imageIpfsHash,
      projectId: project._id,
      carbonAmount: carbonWei.toString(),
      carbonKg,
      carbonTons: kgToTons(carbonKg),
      price: calculateCarbonCreditPrice(carbonKg),
      contractAddress: CARBON_CREDIT_CONTRACT.address,
      walletAddress,
      metadata,
    };
  } catch (error) {
    console.error('Minting Error:', error);
    throw error;
  }
};

/**
 * Fetch NFTs owned by an address
 * This queries the blockchain for all carbon credit NFTs owned by a wallet
 */
const fetchUserNFTs = async (walletAddress) => {
  try {
    // This would use a JSON-RPC provider to query the blockchain
    // For now, return empty array - implement with proper provider
    console.log('Fetching NFTs for wallet:', walletAddress);

    // TODO: Implement with ethers.js provider
    // const provider = new ethers.providers.JsonRpcProvider(POLYGON_AMOY_CONFIG.rpcUrl);
    // const contract = new ethers.Contract(CARBON_CREDIT_CONTRACT.address, CARBON_CREDIT_CONTRACT.abi, provider);
    // const tokenIds = await contract.tokensOfOwner(walletAddress);

    return [];
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return [];
  }
};

/**
 * Fetch all minted carbon credit NFTs for marketplace
 * Returns list of NFTs with metadata
 */
const fetchAllCarbonCreditNFTs = async () => {
  try {
    console.log('Fetching all carbon credit NFTs from blockchain...');

    // TODO: Implement with blockchain indexer or event listener
    // For now, return empty array

    return [];
  } catch (error) {
    console.error('Error fetching marketplace NFTs:', error);
    return [];
  }
};

/**
 * ===== EXPORTS =====
 */
export default {
  // Configuration
  POLYGON_AMOY_CONFIG,
  CARBON_CREDIT_CONTRACT,
  CARBON_CREDIT_PRICING,

  // Utility functions
  kgToTons,
  kgToWei,
  weiToKg,
  calculateCarbonCreditPrice,
  generateCIDFromProjectId,

  // IPFS functions
  uploadMetadataToPinata,
  uploadImageToPinata,
  fetchMetadataFromIPFS,

  // NFT functions
  createNFTMetadata,
  mintCarbonCreditNFT,
  fetchUserNFTs,
  fetchAllCarbonCreditNFTs,
};
