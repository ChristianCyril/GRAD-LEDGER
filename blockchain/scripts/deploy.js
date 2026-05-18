const { ethers } = require('hardhat');

async function main() {
  const Factory  = await ethers.getContractFactory('CertificateRegistry');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log('CertificateRegistry deployed to:', await contract.getAddress());
}

main().catch((err) => { console.error(err); process.exit(1); });