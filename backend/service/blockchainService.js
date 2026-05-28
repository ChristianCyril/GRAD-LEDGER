import contract from '../config/contract.js';

export const issueOnChain = async (certId, certHash) => {
  const tx      = await contract.issueCertificate(certId, certHash);
  const receipt = await tx.wait();
  return receipt.hash;
};

export const revokeOnChain = async (certId) => {
  const tx      = await contract.revokeCertificate(certId);
  const receipt = await tx.wait();
  return receipt.hash;
};

export const verifyOnChain = async (certId) => {
  const [exists, isRevoked, certHash, issuedAt] = await contract.verifyCertificate(certId);
  return { exists, isRevoked, certHash, issuedAt: Number(issuedAt) };
};

export const unrevokeOnChain = async (certId) => {
  const tx      = await contract.unrevokeCertificate(certId);
  const receipt = await tx.wait();
  return receipt.hash;
};