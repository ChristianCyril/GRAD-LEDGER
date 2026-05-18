const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CertificateRegistry', function () {
  let contract;
  let owner;

  // Deploy a fresh contract before each test
  // This ensures tests are completely isolated from each other
  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('CertificateRegistry');
    contract      = await Factory.deploy();
    await contract.waitForDeployment();
  });

  // ─── issueCertificate ────────────────────────────────────────────────────────

  describe('issueCertificate', function () {

    it('should issue a certificate successfully with valid inputs', async function () {
      await expect(
        contract.issueCertificate('CERT-001', '0xabc123hash')
      ).to.not.be.reverted;
    });

    it('should revert when issuing the same certId twice', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');

      await expect(
        contract.issueCertificate('CERT-001', '0xdifferenthash')
      ).to.be.revertedWith('Certificate already exists');
    });

    it('should emit CertificateIssued event with correct arguments', async function () {
      await expect(
        contract.issueCertificate('CERT-001', '0xabc123hash')
      )
        .to.emit(contract, 'CertificateIssued')
        .withArgs('CERT-001', '0xabc123hash', owner.address);
    });

  });

  // ─── verifyCertificate ───────────────────────────────────────────────────────

  describe('verifyCertificate', function () {

    it('should return exists=true and isRevoked=false after issuing', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');

      const [exists, isRevoked, certHash, issuedAt] =
        await contract.verifyCertificate('CERT-001');

      expect(exists).to.equal(true);
      expect(isRevoked).to.equal(false);
    });

    it('should return the correct certHash after issuing', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');

      const [, , certHash] = await contract.verifyCertificate('CERT-001');

      expect(certHash).to.equal('0xabc123hash');
    });

    it('should return exists=false for a certId that was never issued', async function () {
      const [exists] = await contract.verifyCertificate('CERT-DOES-NOT-EXIST');

      expect(exists).to.equal(false);
    });

    it('should return empty values for a non-existent certificate', async function () {
      const [exists, isRevoked, certHash, issuedAt] =
        await contract.verifyCertificate('CERT-DOES-NOT-EXIST');

      expect(exists).to.equal(false);
      expect(isRevoked).to.equal(false);
      expect(certHash).to.equal('');
      expect(issuedAt).to.equal(0);
    });

    it('should return a non-zero issuedAt timestamp after issuing', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');

      const [, , , issuedAt] = await contract.verifyCertificate('CERT-001');

      expect(Number(issuedAt)).to.be.greaterThan(0);
    });

  });

  // ─── revokeCertificate ───────────────────────────────────────────────────────

  describe('revokeCertificate', function () {

    it('should revoke an existing certificate successfully', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');

      await expect(
        contract.revokeCertificate('CERT-001')
      ).to.not.be.reverted;
    });

    it('should set isRevoked=true after revoking', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');
      await contract.revokeCertificate('CERT-001');

      const [, isRevoked] = await contract.verifyCertificate('CERT-001');

      expect(isRevoked).to.equal(true);
    });

    it('should revert when revoking a certificate that does not exist', async function () {
      await expect(
        contract.revokeCertificate('CERT-DOES-NOT-EXIST')
      ).to.be.revertedWith('Certificate not found');
    });

    it('should revert when revoking a certificate that is already revoked', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');
      await contract.revokeCertificate('CERT-001');

      await expect(
        contract.revokeCertificate('CERT-001')
      ).to.be.revertedWith('Certificate already revoked');
    });

    it('should emit CertificateRevoked event with correct arguments', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');

      await expect(
        contract.revokeCertificate('CERT-001')
      )
        .to.emit(contract, 'CertificateRevoked')
        .withArgs('CERT-001', owner.address);
    });

    it('should keep certHash and issuedAt intact after revoking', async function () {
      await contract.issueCertificate('CERT-001', '0xabc123hash');
      await contract.revokeCertificate('CERT-001');

      const [exists, isRevoked, certHash, issuedAt] =
        await contract.verifyCertificate('CERT-001');

      expect(exists).to.equal(true);
      expect(isRevoked).to.equal(true);
      expect(certHash).to.equal('0xabc123hash');
      expect(Number(issuedAt)).to.be.greaterThan(0);
    });

  });

  // ─── Full lifecycle ───────────────────────────────────────────────────────────

  describe('Full certificate lifecycle', function () {

    it('should handle issue → verify → revoke → verify correctly', async function () {
      // Issue
      await contract.issueCertificate('CERT-001', '0xabc123hash');

      // Verify after issue
      let [exists, isRevoked] = await contract.verifyCertificate('CERT-001');
      expect(exists).to.equal(true);
      expect(isRevoked).to.equal(false);

      // Revoke
      await contract.revokeCertificate('CERT-001');

      // Verify after revoke
      [exists, isRevoked] = await contract.verifyCertificate('CERT-001');
      expect(exists).to.equal(true);
      expect(isRevoked).to.equal(true);
    });

    it('should handle multiple different certificates independently', async function () {
      await contract.issueCertificate('CERT-001', '0xhash001');
      await contract.issueCertificate('CERT-002', '0xhash002');
      await contract.issueCertificate('CERT-003', '0xhash003');

      // Revoke only CERT-002
      await contract.revokeCertificate('CERT-002');

      const [exists1, isRevoked1] = await contract.verifyCertificate('CERT-001');
      const [exists2, isRevoked2] = await contract.verifyCertificate('CERT-002');
      const [exists3, isRevoked3] = await contract.verifyCertificate('CERT-003');

      // CERT-001 unaffected
      expect(exists1).to.equal(true);
      expect(isRevoked1).to.equal(false);

      // CERT-002 revoked
      expect(exists2).to.equal(true);
      expect(isRevoked2).to.equal(true);

      // CERT-003 unaffected
      expect(exists3).to.equal(true);
      expect(isRevoked3).to.equal(false);
    });

  });

});