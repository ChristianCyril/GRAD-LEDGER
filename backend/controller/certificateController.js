import { v4 as uuid }        from 'uuid';
import fs                    from 'fs';
import prisma from '../config/prisma.js';
import cloudinary            from '../config/cloudinary.js';
import { hashPDFFile }       from '../service/hashService.js';
import { generateQRCode }    from '../service/qrService.js';
import { issueOnChain, revokeOnChain }      from '../service/blockchainService.js';
import { verifyOnChain }     from '../service/blockchainService.js';
import { sendCertificateIssuedEmail,sendRevocationEmail} from '../service/emailService.js';

// ─── ISSUE CERTIFICATE ────────────────────────────────────────────────────────

export const issueCertificate = async (req, res) => {
  let tempFilePath = null;

  try {
    const {
      full_name,
      matricule,
      email,
      department,
      program,
      year_of_entry,
      year_of_graduation,
      gpa
    } = req.body;

    // ── 1. Validate all text fields are present ──────────────────────────────
    const requiredFields = {
      full_name,
      matricule,
      email,
      department,
      program,
      year_of_entry,
      year_of_graduation,
      gpa
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || String(value).trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        fields:  missingFields
      });
    }

    // ── 2. Validate file was uploaded and is a PDF ───────────────────────────
    if (!req.file) {
      return res.status(400).json({ message: 'Certificate PDF is required' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Uploaded file must be a PDF' });
    }

    tempFilePath = req.file.path;

    // ── 3. Parse numeric fields ──────────────────────────────────────────────
    const yearOfEntry      = parseInt(year_of_entry);
    const yearOfGraduation = parseInt(year_of_graduation);
    const gpaFloat         = parseFloat(gpa);

    if (isNaN(yearOfEntry) || isNaN(yearOfGraduation) || isNaN(gpaFloat)) {
      return res.status(400).json({
        message: 'year_of_entry, year_of_graduation, and gpa must be valid numbers'
      });
    }

    if (yearOfGraduation < yearOfEntry) {
      return res.status(400).json({
        message: 'year_of_graduation cannot be before year_of_entry'
      });
    }

    if (gpaFloat < 0 || gpaFloat > 4) {
      return res.status(400).json({
        message: 'GPA must be between 0 and 4'
      });
    }

    const normalizedEmail     = email.trim().toLowerCase();
    const normalizedMatricule = matricule.trim();
    const orgId               = req.user.orgId;

    // ── 4. Check if student with same [org_id, email] already exists ─────────
    const existingStudentByEmail = await prisma.student.findUnique({
      where: {
        org_id_email: {
          org_id: orgId,
          email:  normalizedEmail
        }
      }
    });

    // ── 5. Check if student with same [org_id, matricule] already exists ──────
    const existingStudentByMatricule = await prisma.student.findUnique({
      where: {
        org_id_matricule: {
          org_id:    orgId,
          matricule: normalizedMatricule
        }
      }
    });

    // If both email and matricule exist but belong to different students
    // that is a data conflict — the admin may have mixed up details
    if (
      existingStudentByEmail &&
      existingStudentByMatricule &&
      existingStudentByEmail.id !== existingStudentByMatricule.id
    ) {
      return res.status(409).json({
        message: 'The provided email and matricule belong to different students in this organisation'
      });
    }

    // ── 6. Check for duplicate certificate before any expensive operations ────
    // If this student already exists, check they don't already have a
    // certificate for the same program and graduation year
    const existingStudent = existingStudentByEmail || existingStudentByMatricule;

    if (existingStudent) {
      const duplicate = await prisma.certificate.findUnique({
        where: {
          student_id_org_id_program_year_of_graduation: {
            student_id:         existingStudent.id,
            org_id:             orgId,
            program:            program.trim(),
            year_of_graduation: yearOfGraduation
          }
        }
      });

      if (duplicate) {
        return res.status(409).json({
          message: 'A certificate for this student, program, and graduation year already exists'
        });
      }
    }

    // ── 7. Hash the PDF ──────────────────────────────────────────────────────
    const certHash = hashPDFFile(tempFilePath);

    // ── 8. Check blockchain for duplicate hash ───────────────────────────────
    // Generate certId now so we can use it for Cloudinary and blockchain
    const certId = uuid();

    // Also check if this exact PDF hash already exists in the database
    // (catches duplicates even if blockchain is out of sync)
    const duplicateHash = await prisma.certificate.findUnique({
      where: { certificate_hash: certHash }
    });

    if (duplicateHash) {
      return res.status(409).json({
        message: 'This PDF has already been issued as a certificate'
      });
    }

    // ── 9. Upload PDF to Cloudinary ──────────────────────────────────────────
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploader.upload(tempFilePath, {
        folder:        'certchain/certificates',
        resource_type: 'raw',
        public_id:     certId
      });
    } catch (cloudinaryErr) {
      console.error('Cloudinary upload error:', {
        code: cloudinaryErr.code,
        message: cloudinaryErr.message,
        syscall: cloudinaryErr.syscall,
        hostname: cloudinaryErr.hostname
      });
      
      // Check if it's a network error
      if (cloudinaryErr.code === 'EAI_AGAIN' || cloudinaryErr.code === 'ENOTFOUND') {
        return res.status(503).json({
          message: 'Cloudinary service is currently unavailable. Please check your network connection and Cloudinary credentials.',
          error: cloudinaryErr.message,
          hint: 'Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set in your .env file'
        });
      }
      throw cloudinaryErr;
    }

    const cloudinaryUrl = uploadResult.secure_url;

    // ── 10. Delete temp file ─────────────────────────────────────────────────
    fs.unlinkSync(tempFilePath);
    tempFilePath = null;

    // ── 11. Create Student if new, or use existing ───────────────────────────
    let student;

    if (existingStudent) {
      student = existingStudent;
    } else {
      student = await prisma.student.create({
        data: {
          org_id:    orgId,
          full_name: full_name.trim(),
          matricule: normalizedMatricule,
          email:     normalizedEmail
        }
      });
    }

    // ── 12. Create Certificate record with PENDING status ────────────────────
    const certificate = await prisma.certificate.create({
      data: {
        id:                certId,
        org_id:            orgId,
        student_id:        student.id,
        issued_by_id:      req.user.id,
        department:        department.trim(),
        program:           program.trim(),
        year_of_entry:     yearOfEntry,
        year_of_graduation: yearOfGraduation,
        gpa:               gpaFloat,
        certificate_hash:  certHash,
        cloudinary_url:    cloudinaryUrl,
        status:            'PENDING'
      }
    });

    // ── 13. Submit to blockchain ─────────────────────────────────────────────
    let txHash = null;
    let blockchainFailed = false;

    try {
      txHash = await issueOnChain(certId, certHash);

      // Update certificate to CONFIRMED with tx hash
      await prisma.certificate.update({
        where: { id: certId },
        data: {
          status:  'CONFIRMED',
          tx_hash: txHash
        }
      });

    } catch (blockchainErr) {
      console.error('Blockchain issuance failed:', blockchainErr);
      blockchainFailed = true;

      // Update certificate to FAILED — student record and PDF are preserved
      await prisma.certificate.update({
        where: { id: certId },
        data:  { status: 'FAILED' }
      });
    }

    // ── 14. Generate QR code ─────────────────────────────────────────────────
    const qrCodeDataUrl = await generateQRCode(certId);

    // ── 15. Create audit log ─────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        org_id:      orgId,
        actor_id:    req.user.id,
        action:      'CERTIFICATE_ISSUED',
        description: `Certificate issued to ${full_name.trim()} (${normalizedEmail}) for ${program.trim()} — ${yearOfGraduation}`
      }
    });

    
    // ── 16. Send email to student ────────────────────────────────────────────

    let emailError = false;
    try {
      await sendCertificateIssuedEmail(
        normalizedEmail,
        full_name.trim(),
        certId,
        cloudinaryUrl,
        qrCodeDataUrl
      )
      await prisma.certificate.update({
        where:{ id: certId },
        data:{issuance_email_status: 'SENT'}
      })

    } catch (err) {
      console.error('sendCertificateIssuedEmail error:', err)
      emailError = true
      await prisma.certificate.update({
        where:{ id: certId },
        data:{issuance_email_status: 'FAILED'}
      }).catch(dbErr => console.error('Failed to log email status to DB:', dbErr));
    }


    // ── 17. Return response ──────────────────────────────────────────────────
    switch (true) {
      // Case 1: BOTH failed
      case blockchainFailed && emailError:
        return res.status(202).json({
          message: 'Certificate saved locally, but both the blockchain anchor and email notification failed.',
          certificate: { id: certId, status: 'FAILED', issuance_email_status: 'FAILED' }
        });

      // Case 2: ONLY Blockchain failed
      case blockchainFailed:
        return res.status(202).json({
          message: 'Certificate saved and email sent, but the blockchain transaction failed. You can retry from the certificates list.',
          certificate: { id: certId, status: 'FAILED', issuance_email_status: 'SENT' }
        });

      // Case 3: ONLY Email failed
      case emailError:
        return res.status(201).json({
          message: 'Certificate anchored to blockchain successfully, but the notification email failed to send.',
          certificate: { id: certId, status: 'CONFIRMED', tx_hash: txHash, issuance_email_status: 'FAILED' }
        });

      // Default: EVERYTHING succeeded
      default:
        return res.status(201).json({
          message: 'Certificate issued successfully',
          certificate: { id: certId, status: 'CONFIRMED', tx_hash: txHash }
        });
    }


  } catch (err) {
    // Clean up temp file if error occurred before step 10
    if (tempFilePath) {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch {
        console.warn(`Failed to delete temp file: ${tempFilePath}`);
      }
    }

    console.error('issueCertificate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const retryCertificate = async (req, res) => {
  try {
    const { id } = req.params;

    // ── 1. Find the certificate ──────────────────────────────────────────────
    const certificate = await prisma.certificate.findUnique({
      where:   { id },
      include: {
        student:      true,
        organisation: true
      }
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // ── 2. Verify the certificate belongs to the caller's organisation ────────
    if (certificate.org_id !== req.user.orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // ── 3. Only FAILED certificates can be retried ───────────────────────────
    if (certificate.status === 'CONFIRMED') {
      return res.status(400).json({
        message: 'This certificate has already been confirmed on the blockchain'
      });
    }

    if (certificate.status === 'REVOKED') {
      return res.status(400).json({
        message: 'Revoked certificates cannot be retried'
      });
    }

    if (certificate.status === 'PENDING') {
      return res.status(400).json({
        message: 'This certificate is still pending. Please wait before retrying'
      });
    }

    // At this point status must be FAILED — safe to retry

    // ── 4. Check if this certId already exists on the blockchain ─────────────
    const onChain = await verifyOnChain(certificate.id);

    if (onChain.exists) {
      // Transaction went through but DB was not updated — fix the DB record
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: {
          status: onChain.isRevoked ? 'REVOKED' : 'CONFIRMED'
        }
      });

      return res.status(200).json({
        message:     'Certificate was already on the blockchain. Status has been corrected.',
        certificate: {
          id:     certificate.id,
          status: onChain.isRevoked ? 'REVOKED' : 'CONFIRMED'
        }
      });
    }

    // ── 5. Retry the blockchain transaction ──────────────────────────────────
    let txHash;

    try {
      txHash = await issueOnChain(certificate.id, certificate.certificate_hash);
    } catch (blockchainErr) {
      console.error('Retry blockchain transaction failed:', blockchainErr);

      return res.status(500).json({
        message: 'Blockchain transaction failed again. Please try again later.'
      });
    }

    // ── 6. Update certificate to CONFIRMED ───────────────────────────────────
    await prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        status:  'CONFIRMED',
        tx_hash: txHash
      }
    });

    // ── 7. Return success ────────────────────────────────────────────────────
    return res.status(200).json({
      message:     'Certificate successfully confirmed on the blockchain',
      certificate: {
        id:      certificate.id,
        status:  'CONFIRMED',
        tx_hash: txHash
      }
    });

  } catch (err) {
    console.error('retryCertificate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const resendCertificateEmail = async (req, res) => {
  try {
    const { id } = req.params;

    // ── 1. Find the certificate ────────────────────────────────────────────
    const certificate = await prisma.certificate.findUnique({
      where:   { id },
      include: { student: true }
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // ── 2. Verify it belongs to the caller's organisation ──────────────────
    if (certificate.org_id !== req.user.orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // ── 3. Only resend if email previously failed ──────────────────────────
    if (certificate.issuance_email_status === 'SENT') {
      return res.status(400).json({
        message: 'Issuance email was already sent successfully to this student'
      });
    }

    if (certificate.issuance_email_status === 'PENDING') {
      return res.status(400).json({
        message: 'Certificate issuance is still in progress'
      });
    }

    // ── 4. Certificate must be CONFIRMED to resend ─────────────────────────
    if (certificate.status !== 'CONFIRMED') {
      return res.status(400).json({
        message: `Cannot resend email for a certificate with status: ${certificate.status}. The certificate must be confirmed on the blockchain first.`
      });
    }

    // ── 5. Mark email as PENDING before attempting ─────────────────────────
    await prisma.certificate.update({
      where: { id },
      data:  { issuance_email_status: 'PENDING' }
    });

    // ── 6. Regenerate QR code and resend ──────────────────────────────────
    const qrCodeDataUrl = await generateQRCode(certificate.id);

    try {
      await sendCertificateIssuedEmail(
        certificate.student.email,
        certificate.student.full_name,
        certificate.id,
        certificate.cloudinary_url,
        qrCodeDataUrl
      );

      // ── 7. Mark as SENT on success ───────────────────────────────────────
      await prisma.certificate.update({
        where: { id },
        data:  { issuance_email_status: 'SENT' }
      });

      return res.status(200).json({
        message: `Issuance email successfully resent to ${certificate.student.email}`
      });

    } catch (emailErr) {
      console.error('resendCertificateEmail send error:', emailErr);

      // ── 8. Mark as FAILED again if sending fails ─────────────────────────
      await prisma.certificate.update({
        where: { id },
        data:  { issuance_email_status: 'FAILED' }
      });

      return res.status(500).json({
        message: 'Failed to resend email. Please check your email configuration and try again.'
      });
    }

  } catch (err) {
    console.error('resendCertificateEmail error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrgCertificates = async (req, res) => {
  try {
    const {
      search,
      status,
      page  = '1',
      limit = '10'
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // ── 1. Build where clause ────────────────────────────────────────────────
    const where = {
      org_id: req.user.orgId
    };

    if (status) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'FAILED', 'REVOKED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      where.status = status;
    }

    if (search?.trim()) {
      where.student = {
        OR: [
          { full_name: { contains: search.trim(), mode: 'insensitive' } },
          { email:     { contains: search.trim(), mode: 'insensitive' } },
          { matricule: { contains: search.trim(), mode: 'insensitive' } }
        ]
      };
    }

    // ── 2. Query certificates and total count in parallel ────────────────────
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        select: {
          id:                    true,
          department:            true,
          program:               true,
          year_of_entry:         true,
          year_of_graduation:    true,
          gpa:                   true,
          certificate_hash:      true,
          cloudinary_url:        true,
          tx_hash:               true,
          status:                true,
          revoke_reason:         true,
          issued_at:             true,
          revoked_at:            true,
          issuance_email_status: true,
          student: {
            select: {
              id:        true,
              full_name: true,
              matricule: true,
              email:     true
            }
          },
          issued_by: {
            select: {
              id:        true,
              full_name: true,
              job_title: true,
              role:      true
            }
          }
        },
        orderBy: { issued_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.certificate.count({ where })
    ]);

    return res.status(200).json({
      data:  certificates,
      total,
      page:  pageNum,
      limit: limitNum
    });

  } catch (err) {
    console.error('getOrgCertificates error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCertificateById = async (req, res) => {
  try {
    const { id } = req.params;

    // ── 1. Find the certificate ──────────────────────────────────────────────
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: {
        id:                    true,
        department:            true,
        program:               true,
        year_of_entry:         true,
        year_of_graduation:    true,
        gpa:                   true,
        certificate_hash:      true,
        cloudinary_url:        true,
        tx_hash:               true,
        status:                true,
        revoke_reason:         true,
        issued_at:             true,
        revoked_at:            true,
        issuance_email_status: true,
        student: {
          select: {
            id:        true,
            full_name: true,
            matricule: true,
            email:     true
          }
        },
        issued_by: {
          select: {
            id:        true,
            full_name: true,
            job_title: true,
            role:      true
          }
        },
        organisation: {
          select: {
            id:   true,
            name: true,
            code: true
          }
        }
      }
    });

    // ── 2. Return 404 if not found ───────────────────────────────────────────
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // ── 3. Verify it belongs to the caller's organisation ────────────────────
    if (certificate.organisation.id !== req.user.orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json({ data: certificate });

  } catch (err) {
    console.error('getCertificateById error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const revokeCertificate = async (req, res) => {
  try {
    const { id }     = req.params;
    const { reason } = req.body;

    // ── 1. Validate reason is provided ───────────────────────────────────────
    if (!reason?.trim()) {
      return res.status(400).json({ message: 'A revocation reason is required' });
    }

    // ── 2. Find the certificate ──────────────────────────────────────────────
    const certificate = await prisma.certificate.findUnique({
      where:   { id },
      include: {
        student:      true,
        organisation: true
      }
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // ── 3. Verify it belongs to the caller's organisation ────────────────────
    if (certificate.org_id !== req.user.orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // ── 4. Validate current status ───────────────────────────────────────────
    if (certificate.status === 'REVOKED') {
      return res.status(400).json({
        message: 'This certificate has already been revoked'
      });
    }

    if (certificate.status === 'PENDING') {
      return res.status(400).json({
        message: 'Cannot revoke a certificate that is still pending blockchain confirmation'
      });
    }

    if (certificate.status === 'FAILED') {
      return res.status(400).json({
        message: 'Cannot revoke a certificate whose blockchain transaction failed. Retry the transaction first.'
      });
    }

    // At this point status must be CONFIRMED — safe to revoke

    // ── 5. Revoke on the blockchain ──────────────────────────────────────────
    let txHash;

    try {
      txHash = await revokeOnChain(certificate.id);
    } catch (blockchainErr) {
      console.error('revokeOnChain error:', blockchainErr);
      return res.status(500).json({
        message: 'Blockchain revocation failed. Please try again later.'
      });
    }

    // ── 6. Update certificate in DB and create audit log in a transaction ────
    await prisma.$transaction(async (tx) => {
      await tx.certificate.update({
        where: { id },
        data: {
          status:       'REVOKED',
          revoke_reason: reason.trim(),
          revoked_at:   new Date(),
          tx_hash:      txHash
        }
      });

      await tx.auditLog.create({
        data: {
          org_id:      req.user.orgId,
          actor_id:    req.user.id,
          action:      'CERTIFICATE_REVOKED',
          description: `Certificate revoked for ${certificate.student.full_name} (${certificate.student.email}) — Reason: ${reason.trim()}`
        }
      });
    });

    // ── 7. Send revocation notification email to student ─────────────────────
    await sendRevocationEmail(
      certificate.student.email,
      certificate.student.full_name,
      certificate.organisation.name
    ).catch((err) => console.error('sendRevocationEmail error:', err));

    return res.status(200).json({
      message: 'Certificate revoked successfully',
      data: {
        id:           certificate.id,
        status:       'REVOKED',
        revoke_reason: reason.trim(),
        revoked_at:   new Date(),
        tx_hash:      txHash
      }
    });

  } catch (err) {
    console.error('revokeCertificate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};