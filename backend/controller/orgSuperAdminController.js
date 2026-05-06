import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';
import { sendAdminCreatedEmail } from '../service/emailService.js';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const generateTempPassword = () => {
  // Produces a readable mix of letters and numbers e.g. "aB3kP9mX"
  const chars  = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const createAuditLog = (tx, { orgId, actorId, action, description }) =>
  tx.auditLog.create({
    data: {
      org_id:      orgId,
      actor_id:    actorId,
      action,
      description
    }
  });

// ─── CREATE ADMIN ─────────────────────────────────────────────────────────────

export const createAdmin = async (req, res) => {
  try {
    const { full_name, job_title, email, phone } = req.body;

    // ── 1. Validate required fields ──────────────────────────────────────────
    const missingFields = ['full_name', 'job_title', 'email', 'phone']
      .filter((field) => !req.body[field]?.trim());

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        fields:  missingFields
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // ── 2. Check email uniqueness across the entire OrgUser table ────────────
    const existing = await prisma.orgUser.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(409).json({
        message: 'An account with this email already exists'
      });
    }

    // ── 3. Generate and hash temp password ───────────────────────────────────
    const tempPassword    = generateTempPassword();
    const password_hash   = await bcrypt.hash(tempPassword, 10);

    // ── 4. Fetch org name for the email ──────────────────────────────────────
    const organisation = await prisma.organisation.findUnique({
      where:  { id: req.user.orgId },
      select: { name: true }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    // ── 5. Create OrgUser and audit log in a transaction ────────────────────
    //...newAdmin means put everything else I did not grap in this variable.
    const { password_hash: _, ...newAdmin } = await prisma.$transaction(async (tx) => {  //ensures that password is left out when object is sent back
      const admin = await tx.orgUser.create({
        data: {
          org_id:    req.user.orgId,
          role:      'ORG_ADMIN',
          full_name: full_name.trim(),
          job_title: job_title.trim(),
          email:     normalizedEmail,
          phone:     phone.trim(),
          password_hash,
          status:    'ACTIVE'
        }
      });

      await createAuditLog(tx, {
        orgId:       req.user.orgId,
        actorId:     req.user.id,
        action:      'ADMIN_CREATED',
        description: `Admin account created for ${full_name.trim()} (${normalizedEmail})`
      });

      return admin;
    });

    // ── 6. Send welcome email ────────────────────────────────────────────────
    await sendAdminCreatedEmail(
      normalizedEmail,
      full_name.trim(),
      organisation.name,
      tempPassword
    ).catch((err) => console.error('sendAdminCreatedEmail error:', err));

    return res.status(201).json({
      message: 'Admin account created successfully',
      data:    newAdmin
    });

  } catch (err) {
    console.error('createAdmin error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET ADMINS ───────────────────────────────────────────────────────────────

export const getAdmins = async (req, res) => {
  try {
    const { search, status } = req.query;

    // ── 1. Build where clause ────────────────────────────────────────────────
    const where = {
      org_id: req.user.orgId,
      role:   'ORG_ADMIN'
    };

    if (search?.trim()) {
      where.OR = [
        { full_name: { contains: search.trim(), mode: 'insensitive' } },
        { email:     { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    if (status) {
      const validStatuses = ['ACTIVE', 'DISABLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      where.status = status;
    }

    // ── 2. Query ─────────────────────────────────────────────────────────────
    const [admins, total] = await Promise.all([
      prisma.orgUser.findMany({
        where,
        select: {
          id:         true,
          full_name:  true,
          job_title:  true,
          email:      true,
          phone:      true,
          status:     true,
          created_at: true,
          updated_at: true
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.orgUser.count({ where })
    ]);

    return res.status(200).json({ data: admins, total });

  } catch (err) {
    console.error('getAdmins error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── ENABLE ADMIN ─────────────────────────────────────────────────────────────

export const enableAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // ── 1. Find admin and verify org ownership ───────────────────────────────
    const admin = await prisma.orgUser.findUnique({
      where: { id }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.org_id !== req.user.orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role !== 'ORG_ADMIN') {
      return res.status(400).json({ message: 'This action can only be performed on admin accounts' });
    }

    if (admin.status === 'ACTIVE') {
      return res.status(400).json({ message: 'Admin account is already active' });
    }

    // ── 2. Enable admin and create audit log in a transaction ────────────────
    await prisma.$transaction(async (tx) => {
      await tx.orgUser.update({
        where: { id },
        data:  { status: 'ACTIVE' }
      });

      await createAuditLog(tx, {
        orgId:       req.user.orgId,
        actorId:     req.user.id,
        action:      'ADMIN_ENABLED',
        description: `Admin account enabled for ${admin.full_name} (${admin.email})`
      });
    });

    return res.status(200).json({ message: 'Admin account enabled successfully' });

  } catch (err) {
    console.error('enableAdmin error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── DISABLE ADMIN ────────────────────────────────────────────────────────────

export const disableAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // ── 1. Find admin and verify org ownership ───────────────────────────────
    const admin = await prisma.orgUser.findUnique({
      where: { id }
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.org_id !== req.user.orgId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (admin.role !== 'ORG_ADMIN') {
      return res.status(400).json({ message: 'This action can only be performed on admin accounts' });
    }

    if (admin.status === 'DISABLED') {
      return res.status(400).json({ message: 'Admin account is already disabled' });
    }

    // ── 2. Disable admin and create audit log in a transaction ───────────────
    await prisma.$transaction(async (tx) => {
      await tx.orgUser.update({
        where: { id },
        data:  { status: 'DISABLED' }
      });

      await createAuditLog(tx, {
        orgId:       req.user.orgId,
        actorId:     req.user.id,
        action:      'ADMIN_DISABLED',
        description: `Admin account disabled for ${admin.full_name} (${admin.email})`
      });
    });

    return res.status(200).json({ message: 'Admin account disabled successfully' });

  } catch (err) {
    console.error('disableAdmin error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};