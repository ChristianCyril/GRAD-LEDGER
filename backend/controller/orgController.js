import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import fs from 'fs';
import cloudinary from '../config/cloudinary.js';
import prisma from '../config/prisma.js';
import {
  sendRegistrationReceivedEmail,
  sendNewRegistrationNotificationEmail
} from '../service/emailService.js';

export const registerOrganisation = async (req, res) => {
  // Track uploaded temp file paths so we can delete them after Cloudinary upload
  const tempFiles = [];

  try {
    const {
      // Organisation fields
      name,
      code,
      type,
      country,
      city,
      website,
      official_email,
      phone,
      address,
      // Org Super Admin fields
      super_admin_name,
      super_admin_title,
      super_admin_email,
      super_admin_phone,
      password,
      confirm_password
    } = req.body;

    // ── 1. Validate required text fields ────────────────────────────────────
    const requiredFields = {
      name,
      code,
      type,
      country,
      city,
      official_email,
      phone,
      address,
      super_admin_name,
      super_admin_title,
      super_admin_email,
      super_admin_phone,
      password,
      confirm_password
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === '')
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        fields:  missingFields
      });
    }

    // ── 2. Validate required document uploads ───────────────────────────────
    const files = req.files;

    if (!files?.doc_incorporation?.[0]) {
      return res.status(400).json({ message: 'Certificate of Incorporation is required' });
    }
    if (!files?.doc_letter_of_intent?.[0]) {
      return res.status(400).json({ message: 'Letter of Intent is required' });
    }
    if (!files?.doc_accreditation?.[0]) {
      return res.status(400).json({ message: 'Accreditation Document is required' });
    }

    // Track temp paths for cleanup later
    tempFiles.push(
      files.doc_incorporation[0].path,
      files.doc_letter_of_intent[0].path,
      files.doc_accreditation[0].path
    );

    // ── 3. Validate passwords match ─────────────────────────────────────────
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // ── 4. Check uniqueness conflicts before doing any expensive work ────────
    const [existingOrg, existingOrgByCode, existingUser] = await Promise.all([
      prisma.organisation.findUnique({ where: { official_email } }),
      prisma.organisation.findUnique({ where: { code: code.toUpperCase() } }),
      prisma.orgUser.findUnique({ where: { email: super_admin_email } })
    ]);

    if (existingOrg) {
      return res.status(409).json({
        message: 'An organisation with this email is already registered',
        field:   'official_email'
      });
    }

    if (existingOrgByCode) {
      return res.status(409).json({
        message: 'This organisation code is already taken',
        field:   'code'
      });
    }

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists',
        field:   'super_admin_email'
      });
    }

    // ── 5. Upload documents to Cloudinary ────────────────────────────────────
    const uploadToCloudinary = async (filePath, publicId) => {
      const result = await cloudinary.uploader.upload(filePath, {
        folder:        'certchain/org-docs',
        resource_type: 'auto',
        public_id:     publicId
      });
      return result.secure_url;
    };

    const orgId = uuid(); // generate now so we can use it as part of public_id

    const [docIncorporationUrl, docLetterUrl, docAccreditationUrl] = await Promise.all([
      uploadToCloudinary(
        files.doc_incorporation[0].path,
        `${orgId}-incorporation`
      ),
      uploadToCloudinary(
        files.doc_letter_of_intent[0].path,
        `${orgId}-letter-of-intent`
      ),
      uploadToCloudinary(
        files.doc_accreditation[0].path,
        `${orgId}-accreditation`
      )
    ]);

    // ── 6. Delete temp files from uploads/ ───────────────────────────────────
    tempFiles.forEach((filePath) => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Non-fatal — temp file cleanup failure should not block the response
        console.warn(`Failed to delete temp file: ${filePath}`);
      }
    });

    // ── 7. Hash password ─────────────────────────────────────────────────────
    const password_hash = await bcrypt.hash(password, 10);

    // ── 8. Create Organisation and OrgSuperAdmin in a single transaction ─────
    // If either insert fails, both are rolled back — no orphaned records
    await prisma.$transaction(async (tx) => {
      await tx.organisation.create({
        data: {
          id:              orgId,
          name:            name.trim(),
          code:            code.trim().toUpperCase(),
          type,
          country:         country.trim(),
          city:            city.trim(),
          website:         website?.trim() || null,
          official_email:  official_email.trim().toLowerCase(),
          phone:           phone.trim(),
          address:         address.trim(),
          status:          'PENDING',
          doc_incorporation:    docIncorporationUrl,
          doc_letter_of_intent: docLetterUrl,
          doc_accreditation:    docAccreditationUrl
        }
      });

      await tx.orgUser.create({
        data: {
          org_id:        orgId,
          role:          'ORG_SUPER_ADMIN',
          full_name:     super_admin_name.trim(),
          job_title:     super_admin_title.trim(),
          email:         super_admin_email.trim().toLowerCase(),
          phone:         super_admin_phone.trim(),
          password_hash,
          status:        'ACTIVE'
        }
      });
    });

    // ── 9. Send notification emails ──────────────────────────────────────────
    // Both are fire-and-forget — email failure should not fail the registration
    await Promise.allSettled([
      sendRegistrationReceivedEmail(super_admin_email, name),
      sendNewRegistrationNotificationEmail()
    ]);

    return res.status(201).json({
      message: 'Registration submitted successfully. You will be notified once reviewed.'
    });

  } catch (err) {
    // Clean up any temp files that were not yet deleted if an error occurred
    // before step 6 ran
    tempFiles.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        console.warn(`Failed to delete temp file on error: ${filePath}`);
      }
    });

    console.error('registerOrganisation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};