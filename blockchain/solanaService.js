// blockchain/solanaService.js
const { Metaplex, keypairIdentity, irysStorage } = require("@metaplex-foundation/js"); // irysStorage is built-in
const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const fs = require("fs");

// ── CONFIG ────────────────────────────────────────────────────────────────
// NOTE: Ensure your @solana/web3.js is version 1.x (npm install @solana/web3.js@1)
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Load admin keypair from the path in your .env
const secretKey = JSON.parse(fs.readFileSync(process.env.SOLANA_KEYPAIR_PATH));
const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));

const metaplex = Metaplex.make(connection)
  .use(keypairIdentity(adminKeypair))
  .use(irysStorage({ 
    address: "https://devnet.irys.xyz", // Updated Irys devnet URL
    providerUrl: clusterApiUrl("devnet"), 
    timeout: 60000 
  }));

// ── MINT NFTs (1 NFT = 30 t/ha) ──────────────────────────────────────────
async function mintCarbonCredit(mrvResult) {
  const { projectId, plotName, co2_t_per_ha, ecosystem } = mrvResult;

  const creditsIssued = Math.floor(co2_t_per_ha / 30);
  const carbonKg = creditsIssued * 30 * 1000;

  if (creditsIssued < 1) {
    throw new Error(`Insufficient CO2 (${co2_t_per_ha} t/ha) to mint a credit. Min: 30.`);
  }

  console.log(`Starting mint for ${creditsIssued} credits...`);

  // 1. Upload Metadata to Arweave via Irys
  // This step takes ~10-15 seconds on Devnet
  const { uri } = await metaplex.nfts().uploadMetadata({
    name: `Veriflow Carbon Credit — ${plotName || projectId}`,
    description: `Verified carbon sequestration for ${ecosystem || "mangrove"}. 1 credit = 30 tonnes CO2.`,
    image: "https://placehold.co/400x400?text=Veriflow+Credit",
    attributes: [
      { trait_type: "Project ID", value: projectId },
      { trait_type: "CO2 (t/ha)", value: co2_t_per_ha.toString() },
      { trait_type: "Carbon (kg)", value: carbonKg.toString() }
    ]
  });

  // 2. Mint NFTs onto Solana Devnet
  const mintAddresses = [];
  for (let i = 0; i < creditsIssued; i++) {
    const { nft } = await metaplex.nfts().create({
      uri,
      name: `VCC-${projectId.slice(-4).toUpperCase()}-${i + 1}`,
      sellerFeeBasisPoints: 0,
      symbol: "VCC",
      isMutable: false
    });
    mintAddresses.push(nft.address.toString());
  }

  return {
    mintAddresses,
    creditsIssued,
    metadataUri: uri,
    explorerUrl: `https://explorer.solana.com/address/${adminKeypair.publicKey.toString()}?cluster=devnet`
  };
}

async function transferCarbonCredit(mintAddress, buyerWalletAddress) {
  const nft = await metaplex.nfts().findByMint({ mintAddress: new PublicKey(mintAddress) });
  await metaplex.nfts().transfer({
    nftOrSft: nft,
    toOwner: new PublicKey(buyerWalletAddress),
  });
  return { success: true, mintAddress, buyer: buyerWalletAddress };
}

module.exports = { mintCarbonCredit, transferCarbonCredit };