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

//update organisation profile
export const updateOrgProfile = async (req, res) => {
  let tempFilePath = null;
  if (!req.user.orgId) return res.statusCode(401)
  try {
    const orgId = req.user.orgId;
    const {
      name,
      city,
      website,
      phone,
      address
    } = req.body;

    // ── 1. Verify the organisation exists ────────────────────────────────────
    const organisation = await prisma.organisation.findUnique({
      where: { id: orgId }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }
    
    if (organisation.status === 'DISABLED') {
      return res.status(403).json({ message: 'Cannot update profile of a disabled organisation' });
    }

    // ── 2. Validate that at least one field is being updated ─────────────────
    const hasTextField = [name, city, website, phone, address]
      .some((field) => field !== undefined);
    const hasLogoFile  = !!req.file;

    if (!hasTextField && !hasLogoFile) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }

    // ── 3. Upload new logo to Cloudinary if provided ─────────────────────────
    let logo_url = undefined; // undefined means Prisma will leave the field unchanged

    if (hasLogoFile) {
      tempFilePath = req.file.path;

      // Validate it is an image
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: 'Logo must be a JPEG, PNG, or WebP image'
        });
      }

      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder:         'certchain/org-logos',
        resource_type:  'image',
        public_id:      `${orgId}-logo`,
        overwrite:      true,  // replaces the previous logo for this org
        transformation: [{ width: 400, height: 400, crop: 'limit' }]
      });

      logo_url = uploadResult.secure_url;

      // Delete temp file after successful upload
      fs.unlinkSync(tempFilePath);
      tempFilePath = null;
    }

    // ── 4. Build the update payload ──────────────────────────────────────────
    // Only include fields that were actually sent in the request
    // Undefined fields are ignored by Prisma — existing values are preserved
    const updateData = {};

    if (name?.trim())    updateData.name    = name.trim();
    if (city?.trim())    updateData.city    = city.trim();
    if (phone?.trim())   updateData.phone   = phone.trim();
    if (address?.trim()) updateData.address = address.trim();

    // website can be cleared by sending an empty string
    if (website !== undefined) {
      updateData.website = website.trim() === '' ? null : website.trim();
    }

    if (logo_url !== undefined) {
      updateData.logo_url = logo_url;
    }

    // ── 5. Persist the update ────────────────────────────────────────────────
    const updated = await prisma.organisation.update({
      where: { id: orgId },
      data:  updateData,
      select: {
        id:             true,
        name:           true,
        code:           true,
        type:           true,
        country:        true,
        city:           true,
        website:        true,
        logo_url:       true,
        official_email: true,
        phone:          true,
        address:        true,
        status:         true,
        updated_at:     true
      }
    });

    return res.status(200).json({
      message: 'Organisation profile updated successfully',
      data:    updated
    });

  } catch (err) {
    // Clean up temp file if an error occurred after multer saved it
    // but before we deleted it in step 3
    if (tempFilePath) {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch {
        console.warn(`Failed to delete temp file on error: ${tempFilePath}`);
      }
    }

    console.error('updateOrgProfile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrgProfile = async (req, res) => {
  if (!req.user.orgId) return res.statusCode(401)
  try {
    const organisation = await prisma.organisation.findUnique({
      where:  { id: req.user.orgId },
      select: {
        id:             true,
        name:           true,
        code:           true,
        type:           true,
        country:        true,
        city:           true,
        website:        true,
        logo_url:       true,
        official_email: true,
        phone:          true,
        address:        true,
        status:         true,
        created_at:     true,
        updated_at:     true,
        // Include the Org Super Admin's details
        users: {
          where:  { role: 'ORG_SUPER_ADMIN' },
          select: {
            full_name: true,
            job_title: true,
            email:     true,
            phone:     true
          }
        }
      }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    return res.status(200).json({ data: organisation });

  } catch (err) {
    console.error('getOrgProfile error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOrgAnalytics = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    // ── 1. Run all counts in parallel ────────────────────────────────────────
    const [
      totalIssued,
      totalRevoked,
      totalPending,
      totalFailed,
      totalEmailFailed
    ] = await Promise.all([
      prisma.certificate.count({
        where: { org_id: orgId }
      }),
      prisma.certificate.count({
        where: { org_id: orgId, status: 'REVOKED' }
      }),
      prisma.certificate.count({
        where: { org_id: orgId, status: 'PENDING' }
      }),
      prisma.certificate.count({
        where: { org_id: orgId, status: 'FAILED' }
      }),
      prisma.certificate.count({
        where: {
          org_id:                orgId,
          issuance_email_status: 'FAILED'
        }
      })
    ]);

    return res.status(200).json({
      data: {
        totalIssued,
        totalConfirmed: totalIssued - totalRevoked - totalPending - totalFailed,
        totalRevoked,
        totalPending,
        totalFailed,
        totalEmailFailed
      }
    });

  } catch (err) {
    console.error('getOrgAnalytics error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};