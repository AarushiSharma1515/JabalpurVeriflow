# Veriflow Blockchain Integration Guide

## Overview

This guide explains how the Veriflow app integrates blockchain technology to create Carbon Credit NFTs from ML-verified plantation projects.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VERIFLOW SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Farmer Registers Plantation Project                         │
│     └─ PlotRegistrationScreen.jsx                               │
│        - Project details (title, area, location, crop type)     │
│        - Status: "draft" → "submitted"                          │
│                                                                  │
│  2. Admin Runs ML Verification                                  │
│     └─ VerificationScreen.jsx                                   │
│        - Upload drone image                                     │
│        - ML API processes image                                 │
│        - Returns: carbon_sequestration_kg                       │
│        - Saves mlAnalysisResults to project                     │
│                                                                  │
│  3. Admin Approves Project                                      │
│     └─ VerificationScreen.jsx (handleApprove)                   │
│        - Status: "verified"                                     │
│        - Alert: "Mint NFT?" → Yes/No                           │
│                                                                  │
│  4. NFT Minting Process                                         │
│     └─ BlockchainScreen.jsx                                     │
│        a) Create NFT metadata (blockchainService.js)            │
│        b) Upload image to Pinata IPFS                           │
│        c) Upload metadata to Pinata IPFS                        │
│        d) Get IPFS CID (Content Identifier)                     │
│        e) Connect wallet via WebView                            │
│        f) Mint NFT on Polygon Amoy                              │
│        g) Return transaction hash                               │
│                                                                  │
│  5. Marketplace Display                                         │
│     └─ MarketplaceDashboardEnhanced.jsx                         │
│        - Fetch all verified projects                            │
│        - Group by seller (farmer)                               │
│        - Display carbon credits available                       │
│        - Enable purchase transactions                           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
Project Creation → ML Verification → Admin Approval → NFT Minting → Marketplace
     (Farmer)         (ML API)        (Admin UI)      (Blockchain)    (Buyers)
        │                 │                │               │              │
        ▼                 ▼                ▼               ▼              ▼
   project_id      carbon_kg CO2      status:        IPFS CID        NFT Token
   owner info      confidence          verified       metadata        on-chain
   location        biomass data        notes          ERC-721         tradeable
```

## Key Files and Components

### 1. Blockchain Service (`services/blockchainService.js`)

**Purpose**: Core blockchain integration logic

**Key Functions**:
- `mintCarbonCreditNFT()`: Main minting function
  - Uploads image to IPFS
  - Creates metadata from ML results
  - Uploads metadata to IPFS
  - Returns data for smart contract interaction

- `createNFTMetadata()`: Generates ERC-721 compliant metadata
  - Project details
  - Carbon sequestration amount
  - ML analysis confidence scores
  - Location and crop type
  - Owner information

- `uploadMetadataToPinata()`: IPFS upload via Pinata API
  - Uses JWT authentication
  - Returns IPFS hash (CID)

- `calculateCarbonCreditPrice()`: Fixed pricing model
  - $50 per ton of CO2
  - 0.02 MATIC per ton
  - Prevents inflation

**Configuration**:
```javascript
PINATA_CONFIG = {
  apiKey: '86e920e26cad8ea4f7bd',
  apiSecret: 'eaa7d5d783680c0be067635cf2a09bb9ad3562c16795b8c9c04ea328bb2065ec',
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  pinataGatewayUrl: 'https://gateway.pinata.cloud/ipfs/',
}

POLYGON_AMOY_CONFIG = {
  chainId: '0x13882', // 80002 in decimal
  rpcUrl: 'https://rpc-amoy.polygon.technology/',
  blockExplorerUrl: 'https://amoy.polygonscan.com/',
}
```

### 2. Smart Contract (`contracts/CarbonCreditNFT.sol`)

**Purpose**: ERC-721 NFT contract for carbon credits

**Key Features**:
- One NFT per verified project (prevents duplicate minting)
- Stores carbon amount in wei (18 decimals)
- Maps project_id to token_id
- Fixed pricing model
- Full traceability

**Main Functions**:
```solidity
function mintCarbonCredit(
    address to,
    string memory projectId,
    uint256 carbonAmount,
    string memory metadataURI
) public returns (uint256 tokenId)

function getCarbonCredit(uint256 tokenId)
    public view returns (
        string memory projectId,
        uint256 carbonAmount,
        uint256 mintedAt,
        address originalOwner,
        bool isActive
    )

function calculatePrice(uint256 tokenId)
    public view returns (uint256 price)
```

**Deployment Steps**:
1. Install Hardhat: `npm install --save-dev hardhat @openzeppelin/contracts`
2. Configure `hardhat.config.js` with Polygon Amoy RPC
3. Deploy: `npx hardhat run scripts/deploy.js --network amoy`
4. Copy deployed address to `blockchainService.js`

### 3. BlockchainScreen (`screen/BlockchainScreen.jsx`)

**Purpose**: WebView wrapper for wallet connection and minting

**Flow**:
1. Receives project and mlResults from navigation params
2. Calls `blockchainService.mintCarbonCreditNFT()` to prepare metadata
3. Shows loading spinner while uploading to IPFS
4. Injects wallet mock (or real wallet) into WebView
5. Loads HTML minting interface
6. Injects project data via `postMessage`
7. User connects wallet and mints NFT
8. Receives transaction hash via `onMessage`
9. Shows success alert with blockchain explorer link

**Navigation**:
```javascript
navigation.navigate('BlockchainScreen', {
  project: selectedProject,
  mlResults: mlResults,
  imageUri: droneImage?.uri || null,
});
```

### 4. VerificationScreen (`screen/VerificationScreen.jsx`)

**Purpose**: ML verification and approval workflow

**Key Changes** (Line 260-296):
```javascript
// After successful approval
Alert.alert(
  "✅ Project Approved",
  "Would you like to mint a Carbon Credit NFT?",
  [
    { text: "Skip for Now", ... },
    {
      text: "Mint NFT",
      onPress: () => {
        navigation.navigate("BlockchainScreen", {
          project: selectedProject,
          mlResults: mlResults,
          imageUri: droneImage?.uri || null,
        });
      },
    },
  ]
);
```

### 5. Enhanced Marketplace (`screen/MarketplaceDashboardEnhanced.jsx`)

**Purpose**: Display verified carbon credits from approved sellers

**Features**:
- Fetches all verified projects with ML results
- Groups projects by owner (farmer)
- Calculates total carbon credits per seller
- Shows fixed pricing (MATIC)
- Enables purchase transactions
- Displays seller verification badges

**Data Fetching**:
```javascript
// Fetch all verified projects
const response = await axios.get(`${API_BASE}/api/projects`, {
  headers: { Authorization: `Bearer ${token}` },
});

// Filter for verified with ML results
const verifiedProjects = projects.filter(
  (project) =>
    project.status === 'verified' &&
    project.mlAnalysisResults &&
    project.mlAnalysisResults.final_results
);
```

## Installation Steps

### 1. Install Dependencies

```bash
cd /Users/harsh/Downloads/Verfiflow-main/veriflow_app
npm install
```

This will install:
- `ethers@5.7.2` - Ethereum library for blockchain interaction
- `react-native-webview@13.12.2` - WebView component for wallet integration

### 2. Deploy Smart Contract

**Option A: Using Hardhat**

```bash
# Create new directory for Hardhat
mkdir blockchain
cd blockchain

# Initialize Hardhat project
npm init -y
npm install --save-dev hardhat @openzeppelin/contracts @nomicfoundation/hardhat-toolbox

# Initialize Hardhat
npx hardhat init

# Copy contract
cp ../contracts/CarbonCreditNFT.sol contracts/

# Configure hardhat.config.js (see contracts/README.md)

# Deploy
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

**Option B: Using Remix IDE**

1. Go to https://remix.ethereum.org/
2. Create `CarbonCreditNFT.sol` and paste contract code
3. Install OpenZeppelin plugin
4. Compile with Solidity 0.8.20
5. Connect MetaMask to Polygon Amoy
6. Deploy using "Injected Provider"
7. Copy deployed contract address

### 3. Update Configuration

Edit `services/blockchainService.js`:

```javascript
const CARBON_CREDIT_CONTRACT = {
  address: 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE', // Update this!
  abi: [...],
};
```

### 4. Get Polygon Amoy Testnet MATIC

1. Visit https://faucet.polygon.technology/
2. Select "Polygon Amoy"
3. Enter your wallet address
4. Receive test MATIC

### 5. Update Navigation (Already Done)

`App.js` has been updated with BlockchainScreen route.

## Usage Flow

### For Farmers:
1. Register plantation project
2. Upload geotagged photos
3. Wait for admin verification

### For Admins:
1. Navigate to Verification Screen
2. Select unverified project
3. Upload drone image
4. Click "Run ML Analysis"
5. Review results (carbon_sequestration_kg)
6. Add approval notes
7. Click "Approve"
8. Choose "Mint NFT" in alert dialog
9. Wait for IPFS upload
10. Connect wallet in WebView
11. Confirm minting transaction
12. NFT created on Polygon Amoy

### For Marketplace Users:
1. Navigate to Marketplace
2. Browse verified sellers
3. View available carbon credits
4. Connect wallet
5. Purchase carbon credits
6. Transaction executed on blockchain

## Unit Conversion Reference

### Carbon Amount Storage

```javascript
// ML Output
carbon_sequestration_kg = 1250.75  // kg from ML analysis

// Convert to tons
carbon_tons = carbon_sequestration_kg / 1000
// Result: 1.25075 tons

// Convert to wei (for blockchain storage)
carbon_wei = ethers.utils.parseUnits(carbon_kg.toString(), 18)
// Result: 1250750000000000000000 wei

// Calculate price
price_per_ton = 0.02  // MATIC
price = carbon_tons * price_per_ton
// Result: 0.025015 MATIC
```

### Why Wei?

- **Precision**: Blockchain uses integers, not decimals
- **18 decimals**: Standard for ETH/MATIC token precision
- **Consistency**: 1 kg CO2 = 10^18 wei
- **No rounding errors**: Exact representation on-chain

## NFT Metadata Structure

```json
{
  "name": "Carbon Credit #ABC123",
  "description": "Verified carbon credit from...",
  "image": "https://gateway.pinata.cloud/ipfs/QmXXXX",
  "external_url": "https://veriflow.app/projects/ABC123",
  "attributes": [
    {
      "trait_type": "Project ID",
      "value": "507f1f77bcf86cd799439011"
    },
    {
      "trait_type": "Carbon Sequestration (kg)",
      "value": 1250.75,
      "display_type": "number"
    },
    {
      "trait_type": "Carbon Sequestration (tons)",
      "value": 1.2508,
      "display_type": "number"
    },
    {
      "trait_type": "Area (hectares)",
      "value": 5.2,
      "display_type": "number"
    },
    {
      "trait_type": "Crop Type",
      "value": "Mixed Forest"
    },
    {
      "trait_type": "Location",
      "value": "Mumbai, Maharashtra"
    },
    {
      "trait_type": "Satellite Confidence",
      "value": 92.5,
      "display_type": "number"
    },
    {
      "trait_type": "Drone Confidence",
      "value": 88.3,
      "display_type": "number"
    },
    {
      "trait_type": "Price (MATIC)",
      "value": 0.025,
      "display_type": "number"
    }
  ],
  "mlResults": {
    "carbonSequestration": {
      "kg": 1250.75,
      "tons": 1.2508
    },
    "biomass": {
      "agb_Mg_per_ha": 120.5
    }
  }
}
```

## Security Features

### Smart Contract:
- ✅ One NFT per project (prevents duplicate minting)
- ✅ Input validation (non-zero carbon, valid project ID)
- ✅ Owner-only functions for critical operations
- ✅ No reentrancy vulnerabilities
- ✅ Fixed pricing (no manipulation)

### Backend:
- ✅ JWT authentication for API calls
- ✅ Role-based access (admin-only verification)
- ✅ Project status workflow (draft → submitted → verified)

### IPFS:
- ✅ Pinata JWT authentication
- ✅ Immutable metadata storage
- ✅ Permanent content addressing (CID)

## Testing Checklist

### Before Production:

- [ ] Deploy smart contract to Polygon Amoy
- [ ] Update contract address in blockchainService.js
- [ ] Test ML verification flow end-to-end
- [ ] Test NFT minting with real wallet
- [ ] Verify metadata appears correctly on IPFS
- [ ] Test marketplace data fetching
- [ ] Test purchase flow
- [ ] Verify transaction on PolygonScan
- [ ] Test with multiple farmers/projects
- [ ] Ensure no duplicate minting possible

### Manual Test Flow:

```bash
# 1. Start app
npm start

# 2. Login as Admin
# Email: admin@veriflow.com
# Password: admin123

# 3. Navigate to: ML Verification
# 4. Select a submitted project
# 5. Upload drone image
# 6. Click "Run ML Analysis"
# 7. Wait for results
# 8. Add notes: "Approved for carbon credit minting"
# 9. Click "Approve"
# 10. Click "Mint NFT"
# 11. Wait for IPFS upload
# 12. Connect wallet
# 13. Confirm transaction
# 14. Verify success message
# 15. Check PolygonScan for transaction
# 16. Go to Marketplace
# 17. Verify NFT appears in seller's profile
```

## Troubleshooting

### Issue: "Metadata upload failed"
**Solution**: Check Pinata API keys in blockchainService.js

### Issue: "Smart contract not deployed"
**Solution**: Deploy contract and update address in blockchainService.js

### Issue: "Transaction failed"
**Solution**:
- Ensure wallet has MATIC for gas
- Check Polygon Amoy network status
- Verify contract address is correct

### Issue: "Project already minted"
**Solution**: Each project can only be minted once. Check blockchain for existing token.

### Issue: "Marketplace shows no sellers"
**Solution**:
- Ensure projects are verified (status = "verified")
- Check that mlAnalysisResults exists
- Verify API endpoint is reachable

## Future Enhancements

1. **Real Wallet Integration**: Replace mock wallet with WalletConnect
2. **Purchase Transactions**: Implement actual blockchain purchase flow
3. **NFT Gallery**: Show user's owned carbon credits
4. **Transfer Functionality**: Enable carbon credit transfers
5. **Retirement/Burn**: Allow users to retire carbon credits
6. **Blockchain Explorer**: Embedded transaction viewer
7. **Price Discovery**: Dynamic pricing based on market demand
8. **Carbon Credit Staking**: Earn rewards for holding credits
9. **Batch Minting**: Mint multiple projects at once
10. **Multi-chain Support**: Deploy to other networks (Ethereum, BSC)

## Resources

- **Polygon Amoy RPC**: https://rpc-amoy.polygon.technology/
- **Amoy Faucet**: https://faucet.polygon.technology/
- **PolygonScan (Amoy)**: https://amoy.polygonscan.com/
- **Pinata IPFS**: https://pinata.cloud/
- **OpenZeppelin Contracts**: https://docs.openzeppelin.com/contracts/
- **Ethers.js Docs**: https://docs.ethers.io/v5/

## Support

For issues or questions:
1. Check smart contract on PolygonScan
2. Verify IPFS uploads on Pinata dashboard
3. Review React Native logs: `npx react-native log-android` or `log-ios`
4. Test API endpoints with Postman
5. Ensure ML API is running and accessible

## License

This blockchain integration is part of the Veriflow system and follows the same license terms.
