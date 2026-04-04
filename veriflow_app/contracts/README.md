# Carbon Credit NFT Smart Contract

## Overview

This smart contract implements ERC-721 NFTs for tokenizing carbon credits from verified plantation projects. Each NFT represents a verified amount of carbon sequestration measured by the Veriflow ML system.

## Contract Details

- **Contract Name**: CarbonCreditNFT
- **Token Symbol**: VCC (Veriflow Carbon Credit)
- **Standard**: ERC-721 (Non-Fungible Token)
- **Network**: Polygon Amoy Testnet (Chain ID: 80002 / 0x13882)
- **Pricing**: Fixed at 0.02 MATIC per ton of CO2

## Features

1. **Carbon Credit Tokenization**: Each NFT represents a specific amount of carbon sequestered (stored in kg with 18 decimal precision)
2. **Project Mapping**: Each project ID can only be minted once, preventing duplicate credits
3. **IPFS Metadata**: All NFT metadata is stored on IPFS via Pinata
4. **Fixed Pricing**: Price per ton is constant to prevent inflation
5. **Traceability**: Full history of minting and ownership transfers
6. **Marketplace Ready**: Built-in functions for querying and trading

## Deployment Instructions

### Prerequisites

1. Install Node.js and npm
2. Install Hardhat or Foundry
3. Get Polygon Amoy testnet MATIC from faucet: https://faucet.polygon.technology/

### Option 1: Deploy with Hardhat

```bash
# Install dependencies
npm install --save-dev hardhat @openzeppelin/contracts @nomicfoundation/hardhat-toolbox

# Initialize Hardhat project
npx hardhat init

# Create deployment script
# Copy CarbonCreditNFT.sol to contracts/
```

Create `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = "YOUR_PRIVATE_KEY_HERE";

module.exports = {
  solidity: "0.8.20",
  networks: {
    amoy: {
      url: "https://rpc-amoy.polygon.technology/",
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: "YOUR_POLYGONSCAN_API_KEY",
    },
  },
};
```

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const CarbonCreditNFT = await hre.ethers.getContractFactory("CarbonCreditNFT");
  const contract = await CarbonCreditNFT.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CarbonCreditNFT deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Deploy:

```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy
```

### Option 2: Deploy with Remix

1. Go to https://remix.ethereum.org/
2. Create new file `CarbonCreditNFT.sol`
3. Copy the contract code
4. Install OpenZeppelin contracts:
   - Click on "Plugin Manager"
   - Activate "OpenZeppelin Contracts"
5. Compile the contract (Solidity 0.8.20)
6. Connect MetaMask to Polygon Amoy
7. Deploy using "Injected Provider"

### After Deployment

1. **Copy the contract address** from deployment output
2. **Update blockchainService.js** with the deployed address:

```javascript
const CARBON_CREDIT_CONTRACT = {
  address: 'YOUR_DEPLOYED_CONTRACT_ADDRESS', // Replace this
  abi: [...]
};
```

3. **Verify the contract** on PolygonScan (optional but recommended):

```bash
npx hardhat verify --network amoy YOUR_CONTRACT_ADDRESS
```

## Contract Functions

### Public Functions

#### `mintCarbonCredit`
Mints a new carbon credit NFT.

```solidity
function mintCarbonCredit(
    address to,
    string memory projectId,
    uint256 carbonAmount,
    string memory metadataURI
) public returns (uint256 tokenId)
```

**Parameters:**
- `to`: Address to receive the NFT
- `projectId`: Unique project identifier from backend
- `carbonAmount`: Carbon sequestered in wei (kg * 10^18)
- `metadataURI`: IPFS URI for metadata

**Returns:** Token ID of minted NFT

#### `getCarbonCredit`
Returns carbon credit details.

```solidity
function getCarbonCredit(uint256 tokenId)
    public view returns (
        string memory projectId,
        uint256 carbonAmount,
        uint256 mintedAt,
        address originalOwner,
        bool isActive
    )
```

#### `getTokenByProjectId`
Get token ID from project ID.

```solidity
function getTokenByProjectId(string memory projectId)
    public view returns (uint256 tokenId)
```

#### `calculatePrice`
Calculate the purchase price for a carbon credit.

```solidity
function calculatePrice(uint256 tokenId)
    public view returns (uint256 price)
```

**Returns:** Price in wei (MATIC)

#### `tokensOfOwner`
Get all token IDs owned by an address.

```solidity
function tokensOfOwner(address owner)
    public view returns (uint256[] memory tokenIds)
```

#### `isProjectMinted`
Check if a project has already been minted.

```solidity
function isProjectMinted(string memory projectId)
    public view returns (bool)
```

## Usage Example

### Minting a Carbon Credit NFT

```javascript
import { ethers } from 'ethers';

// Connect to Polygon Amoy
const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');
const wallet = new ethers.Wallet(privateKey, provider);

// Contract instance
const contract = new ethers.Contract(contractAddress, abi, wallet);

// Prepare data
const projectId = '507f1f77bcf86cd799439011'; // MongoDB ObjectId
const carbonKg = 1250.75; // kg from ML results
const carbonWei = ethers.parseUnits(carbonKg.toString(), 18);
const metadataURI = 'https://gateway.pinata.cloud/ipfs/QmXXXXXXXX';

// Mint NFT
const tx = await contract.mintCarbonCredit(
  walletAddress,
  projectId,
  carbonWei,
  metadataURI
);

await tx.wait();
console.log('NFT Minted! Token ID:', tx.value);
```

### Querying NFTs

```javascript
// Get all NFTs owned by an address
const tokenIds = await contract.tokensOfOwner(walletAddress);

// Get carbon credit details
for (const tokenId of tokenIds) {
  const credit = await contract.getCarbonCredit(tokenId);
  console.log('Project ID:', credit.projectId);
  console.log('Carbon Amount (wei):', credit.carbonAmount);
  console.log('Price:', ethers.formatEther(await contract.calculatePrice(tokenId)), 'MATIC');
}
```

## Integration with Veriflow App

### Flow Diagram

```
1. Farmer Registers Plot
   ↓
2. Admin Runs ML Verification
   ↓
3. ML System Returns Carbon Sequestration (kg)
   ↓
4. Admin Approves Verification
   ↓
5. BlockchainService Creates NFT Metadata
   ↓
6. Metadata Uploaded to Pinata IPFS
   ↓
7. Smart Contract Mints NFT
   ↓
8. NFT Listed on Marketplace
   ↓
9. Users Can Purchase Carbon Credits
```

### Integration Points

1. **VerificationScreen.jsx** (Line 236-271): After admin approves, trigger minting
2. **blockchainService.js**: Handles IPFS upload and metadata creation
3. **BlockchainScreen.jsx**: WebView wrapper for wallet connection and minting
4. **MarketplaceDashboard.jsx**: Display minted NFTs and enable purchases

## Security Considerations

1. **Project Uniqueness**: Each project can only be minted once
2. **Ownership**: Only token owner or contract owner can deactivate credits
3. **Zero Address Protection**: Cannot mint to zero address
4. **Input Validation**: All inputs are validated
5. **Reentrancy**: No external calls in state-changing functions

## Testing

Create test file `test/CarbonCreditNFT.test.js`:

```javascript
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarbonCreditNFT", function () {
  let contract;
  let owner;
  let farmer;

  beforeEach(async function () {
    [owner, farmer] = await ethers.getSigners();
    const CarbonCreditNFT = await ethers.getContractFactory("CarbonCreditNFT");
    contract = await CarbonCreditNFT.deploy();
    await contract.waitForDeployment();
  });

  it("Should mint a carbon credit NFT", async function () {
    const projectId = "TEST-PROJECT-001";
    const carbonAmount = ethers.parseUnits("1000", 18); // 1000 kg
    const metadataURI = "ipfs://QmTest123";

    await contract.mintCarbonCredit(
      farmer.address,
      projectId,
      carbonAmount,
      metadataURI
    );

    expect(await contract.ownerOf(1)).to.equal(farmer.address);
    expect(await contract.isProjectMinted(projectId)).to.be.true;
  });

  it("Should not allow duplicate project minting", async function () {
    const projectId = "TEST-PROJECT-001";
    const carbonAmount = ethers.parseUnits("1000", 18);
    const metadataURI = "ipfs://QmTest123";

    await contract.mintCarbonCredit(
      farmer.address,
      projectId,
      carbonAmount,
      metadataURI
    );

    await expect(
      contract.mintCarbonCredit(
        farmer.address,
        projectId,
        carbonAmount,
        metadataURI
      )
    ).to.be.revertedWith("Project already minted");
  });

  it("Should calculate correct price", async function () {
    const projectId = "TEST-PROJECT-002";
    const carbonKg = 1000; // 1 ton = 1000 kg
    const carbonAmount = ethers.parseUnits(carbonKg.toString(), 18);
    const metadataURI = "ipfs://QmTest456";

    await contract.mintCarbonCredit(
      farmer.address,
      projectId,
      carbonAmount,
      metadataURI
    );

    const price = await contract.calculatePrice(1);
    const expectedPrice = ethers.parseEther("0.02"); // 0.02 MATIC per ton

    expect(price).to.equal(expectedPrice);
  });
});
```

Run tests:

```bash
npx hardhat test
```

## Gas Estimates

Approximate gas costs on Polygon Amoy:

- **Deployment**: ~3,000,000 gas
- **Mint NFT**: ~200,000 gas
- **Transfer**: ~50,000 gas
- **Query (view functions)**: Free

## Resources

- **Polygon Amoy RPC**: https://rpc-amoy.polygon.technology/
- **Amoy Faucet**: https://faucet.polygon.technology/
- **Block Explorer**: https://amoy.polygonscan.com/
- **OpenZeppelin Docs**: https://docs.openzeppelin.com/contracts/
- **Hardhat Docs**: https://hardhat.org/docs

## Support

For issues or questions:
1. Check contract on PolygonScan
2. Review transaction logs
3. Test on Remix first
4. Use Hardhat console for debugging

## License

MIT License - See contract header for details
