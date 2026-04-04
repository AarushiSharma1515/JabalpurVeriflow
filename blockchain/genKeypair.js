const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
const kp = Keypair.generate();
fs.writeFileSync('./admin-keypair.json', JSON.stringify(Array.from(kp.secretKey)));
console.log('PUBLIC KEY:', kp.publicKey.toString());
