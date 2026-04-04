# Veriflow Blockchain - Quick Start Guide

## 🚀 Get Started in 5 Steps

### Step 1: Install Dependencies

```bash
cd /Users/harsh/Downloads/Verfiflow-main/veriflow_app
npm install
```

This installs:
- ✅ ethers.js (blockchain interaction)
- ✅ react-native-webview (wallet integration)
- ✅ All existing dependencies

### Step 2: Deploy Smart Contract

**Quick Method - Using Remix:**

1. Open https://remix.ethereum.org/
2. Create new file: `CarbonCreditNFT.sol`
3. Copy contract from: `contracts/CarbonCreditNFT.sol`
4. Install OpenZeppelin plugin in Remix
5. Compile (Solidity 0.8.20)
6. Get Polygon Amoy MATIC: https://faucet.polygon.technology/
7. Connect MetaMask to Polygon Amoy
8. Deploy contract
9. **COPY THE CONTRACT ADDRESS**

### Step 3: Update Configuration

Edit `services/blockchainService.js` at line 65:

```javascript
const CARBON_CREDIT_CONTRACT = {
  address: 'PASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE', // ← Update this!
  abi: [...],
};
```

### Step 4: Start the App

```bash
npm start
```

Select:
- `a` for Android
- `i` for iOS
- `w` for Web

### Step 5: Test the Flow

**As Admin:**
1. Login (admin credentials)
2. Go to "ML Verification"
3. Select a project
4. Upload drone image
5. Click "Run ML Analysis"
6. Review carbon_sequestration_kg result
7. Add approval notes
8. Click "Approve"
9. Click "Mint NFT" in the popup
10. Wait for IPFS upload
11. Connect wallet
12. Confirm transaction
13. ✅ NFT Minted!

**As Marketplace User:**
1. Go to "Marketplace"
2. Browse verified sellers
3. View carbon credits available
4. Connect wallet
5. Purchase carbon credits

## 📊 What You Get

### Blockchain Features:
✅ ERC-721 NFT for each carbon credit
✅ IPFS metadata storage via Pinata
✅ Fixed pricing (0.02 MATIC per ton CO2)
✅ One NFT per verified project
✅ Full traceability on Polygon Amoy

### App Features:
✅ Automatic NFT minting after ML verification
✅ Enhanced marketplace with real seller data
✅ Carbon credit portfolio for each farmer
✅ Blockchain explorer integration

## 🔧 Configuration Files

### Already Configured:
- ✅ `services/blockchainService.js` - Core blockchain logic
- ✅ `contracts/CarbonCreditNFT.sol` - Smart contract
- ✅ `screen/BlockchainScreen.jsx` - Minting interface
- ✅ `screen/VerificationScreen.jsx` - Approval + Mint flow
- ✅ `screen/MarketplaceDashboardEnhanced.jsx` - Real marketplace
- ✅ `App.js` - Navigation routes
- ✅ `package.json` - Dependencies

### Needs Your Input:
- ⚠️ Contract address in `blockchainService.js` (after deployment)
- ⚠️ HTML minter URL in `BlockchainScreen.jsx` (if you have custom URL)

## 🧪 Testing

### Test ML → Blockchain Flow:

```
Project Creation → ML Analysis → Approval → Mint NFT → Marketplace
     ✓                ✓             ✓          ✓           ✓
```

### Verify on Blockchain:

After minting, check:
- Transaction hash on https://amoy.polygonscan.com/
- Metadata on https://gateway.pinata.cloud/ipfs/YOUR_CID
- NFT in marketplace

## 📁 File Structure

```
veriflow_app/
├── services/
│   └── blockchainService.js       ← Core blockchain logic
├── contracts/
│   ├── CarbonCreditNFT.sol        ← Smart contract
│   └── README.md                  ← Deployment guide
├── screen/
│   ├── BlockchainScreen.jsx       ← Minting interface
│   ├── VerificationScreen.jsx     ← Approval + Mint
│   └── MarketplaceDashboardEnhanced.jsx  ← Real marketplace
├── App.js                         ← Navigation (updated)
├── package.json                   ← Dependencies (updated)
├── BLOCKCHAIN_INTEGRATION_GUIDE.md ← Full documentation
└── BLOCKCHAIN_QUICK_START.md      ← This file
```

## 🔑 Important Values

### Pinata IPFS (Already Configured):
```
API Key: 86e920e26cad8ea4f7bd
API Secret: eaa7d5d783680c0be067635cf2a09bb9ad3562c16795b8c9c04ea328bb2065ec
JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Polygon Amoy:
```
Chain ID: 80002 (0x13882)
RPC: https://rpc-amoy.polygon.technology/
Explorer: https://amoy.polygonscan.com/
Faucet: https://faucet.polygon.technology/
```

### Pricing:
```
Fixed: $50 per ton CO2
Fixed: 0.02 MATIC per ton CO2
```

## ⚠️ Before Production

### Checklist:
- [ ] Deploy smart contract to Polygon Amoy
- [ ] Update contract address in blockchainService.js
- [ ] Get testnet MATIC from faucet
- [ ] Test complete flow: ML → Approval → Mint → Marketplace
- [ ] Verify transaction on PolygonScan
- [ ] Check metadata on IPFS
- [ ] Test with multiple projects
- [ ] Ensure no duplicate minting

## 🆘 Troubleshooting

### "Cannot find module 'ethers'"
```bash
npm install ethers@5.7.2 react-native-webview@13.12.2
```

### "Contract not deployed"
- Deploy contract using Remix
- Update address in blockchainService.js

### "Metadata upload failed"
- Check Pinata keys in blockchainService.js
- Verify internet connection

### "No sellers in marketplace"
- Ensure projects are verified (status = "verified")
- Check mlAnalysisResults exists
- Test API connection

## 📞 Need Help?

1. Read full guide: `BLOCKCHAIN_INTEGRATION_GUIDE.md`
2. Check contract deployment: `contracts/README.md`
3. Review React Native logs
4. Verify API is running
5. Check ML service is accessible

## 🎯 Success Indicators

You'll know it's working when:
- ✅ NFT mints successfully after approval
- ✅ Transaction hash appears in alert
- ✅ Metadata visible on Pinata IPFS
- ✅ Marketplace shows seller with carbon credits
- ✅ PolygonScan shows transaction
- ✅ Token ID increments for each mint

## 🚀 Next Steps

After basic setup:
1. Test with real drone images
2. Verify ML confidence scores
3. Test marketplace purchase flow
4. Implement real wallet integration
5. Add transaction history
6. Enable carbon credit transfers
7. Deploy to mainnet (when ready)

---

**Ready to mint carbon credits? Follow the 5 steps above!** 🌿
