import prisma from '../config/prisma.js';
import { verifyOnChain } from '../service/blockchainService.js';
import { hashPDFFile, hashesMatch } from '../service/hashService.js';
import fs from 'fs';

const formatCertificate = (cert) => ({
  certId:               cert.id,
  studentName:          cert.student.full_name,
  matricule:            cert.student.matricule,
  program:              cert.program,
  department:           cert.department,
  yearOfGraduation:     cert.year_of_graduation,
  gpa:                  cert.gpa,
  issuingOrganisation:  cert.organisation.name,
  issuedAt:             cert.issued_at,
  revokedAt:            cert.revoked_at   ?? null,
  revokeReason:         cert.revoke_reason ?? null,
});


const resolveCertificate = async (certId) => {
  // 1. Check blockchain first — source of truth
  const { exists, isRevoked, certHash: chainHash } = await verifyOnChain(certId);

  if (!exists) {
    return { status: 'NOT_FOUND' };
  }

  // 2. Fetch DB record with relations needed for the response
  const cert = await prisma.certificate.findUnique({
    where: { id: certId },
    include: {
      student:      true,
      organisation: true,
    },
  });

  // Edge case: blockchain has the cert but DB does not (should not happen in normal operation)
  if (!cert) {
    return { status: 'NOT_FOUND' };
  }

  // 3. Revocation check (blockchain is authoritative)
  if (isRevoked) {
    return {
      status:      'REVOKED',
      certificate: formatCertificate(cert),
    };
  }

  // 4. Tamper check — compare DB hash against what the blockchain recorded
  if (!hashesMatch(cert.certificate_hash, chainHash)) {
    return { status: 'TAMPERED' };
  }

  // 5. All checks passed
  return {
    status:      'VALID',
    certificate: formatCertificate(cert),
  };
};


export const verifyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id.trim() === '') {
      return res.status(400).json({ message: 'Certificate ID is required' });
    }

    const result = await resolveCertificate(id.trim());
    return res.status(200).json(result);
  } catch (err) {
    console.error('[verifyByHash]', err);
    return res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};


export const verifyByPDF = async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'A PDF file is required' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are accepted' });
    }

    // Hash the uploaded PDF
    const uploadedHash = hashPDFFile(filePath);

    // Clean up temp file before any async work that could throw
    fs.unlink(filePath, () => {});

    // Look up certificate by hash in DB
    const cert = await prisma.certificate.findUnique({
      where: { certificate_hash: uploadedHash },
    });

    if (!cert) {
      return res.status(200).json({ status: 'NOT_FOUND' });
    }

    // Re-use the same resolution logic as verifyByHash
    const result = await resolveCertificate(cert.id);
    return res.status(200).json(result);
  } catch (err) {
    // Best-effort cleanup if the unlink above hadn't run yet
    if (filePath) fs.unlink(filePath, () => {});
    console.error('[verifyByPDF]', err);
    return res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};