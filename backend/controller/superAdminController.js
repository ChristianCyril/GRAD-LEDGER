import prisma from '../config/prisma.js';
import {
  sendOrgApprovedEmail,
  sendOrgRejectedEmail,
  sendOrgDisabledEmail
} from '../service/emailService.js';

// ─── GET PENDING ORGANISATIONS ────────────────────────────────────────────────

export const getPendingOrganisations = async (req, res) => {
  try {
    const organisations = await prisma.organisation.findMany({
      where: { status: 'PENDING' },
      include: {
        users: {
          where: { role: 'ORG_SUPER_ADMIN' },
          select: {
            full_name: true,
            email:     true,
            phone:     true,
            job_title: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({ data: organisations });

  } catch (err) {
    console.error('getPendingOrganisations error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET ALL ORGANISATIONS ────────────────────────────────────────────────────

export const getAllOrganisations = async (req, res) => {
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

    // Build where clause dynamically based on provided query params
    const where = {};

    if (search?.trim()) {
      where.name = {
        contains: search.trim(),
        mode:     'insensitive'
      };
    }

    if (status) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'DISABLED'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }
      where.status = status;
    }

    const [organisations, total] = await Promise.all([
      prisma.organisation.findMany({
        where,
        select: {
          id:             true,
          name:           true,
          code:           true,
          type:           true,
          country:        true,
          city:           true,
          official_email: true,
          status:         true,
          created_at:     true,
          disabled_at:    true,
          users: {
            where:  { role: 'ORG_SUPER_ADMIN' },
            select: { full_name: true, email: true }
          }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.organisation.count({ where })
    ]);

    return res.status(200).json({
      data:  organisations,
      total,
      page:  pageNum,
      limit: limitNum
    });

  } catch (err) {
    console.error('getAllOrganisations error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET ORGANISATION BY ID ───────────────────────────────────────────────────

export const getOrganisationById = async (req, res) => {
  try {
    const { id } = req.params;

    const organisation = await prisma.organisation.findUnique({
      where:   { id },
      include: {
        users: {
          where:  { role: 'ORG_SUPER_ADMIN' },
          select: {
            full_name: true,
            email:     true,
            phone:     true,
            job_title: true,
            status:    true
          }
        }
      }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    return res.status(200).json({ data: organisation });

  } catch (err) {
    console.error('getOrganisationById error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── APPROVE ORGANISATION ─────────────────────────────────────────────────────

export const approveOrganisation = async (req, res) => {
  try {
    const { id } = req.params;

    const organisation = await prisma.organisation.findUnique({
      where:   { id },
      include: {
        users: {
          where:  { role: 'ORG_SUPER_ADMIN' },
          select: { email: true, full_name: true }
        }
      }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    if (organisation.status !== 'PENDING') {
      return res.status(400).json({
        message: `Only pending organisations can be approved. Current status: ${organisation.status}`
      });
    }

    await prisma.organisation.update({
      where: { id },
      data:  { status: 'APPROVED' }
    });

    // Send approval email to the Org Super Admin
    const superAdmin = organisation.users[0];
    if (superAdmin) {
      await sendOrgApprovedEmail(
        superAdmin.email,
        organisation.name,
        superAdmin.email
      ).catch((err) => console.error('sendOrgApprovedEmail error:', err));
    }

    return res.status(200).json({ message: 'Organisation approved successfully' });

  } catch (err) {
    console.error('approveOrganisation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── REJECT ORGANISATION ──────────────────────────────────────────────────────

export const rejectOrganisation = async (req, res) => {
  try {
    const { id }     = req.params;
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ message: 'A rejection reason is required' });
    }

    const organisation = await prisma.organisation.findUnique({
      where:   { id },
      include: {
        users: {
          where:  { role: 'ORG_SUPER_ADMIN' },
          select: { email: true }
        }
      }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    if (organisation.status !== 'PENDING') {
      return res.status(400).json({
        message: `Only pending organisations can be rejected. Current status: ${organisation.status}`
      });
    }

    await prisma.organisation.update({
      where: { id },
      data: {
        status:           'REJECTED',
        rejection_reason: reason.trim()
      }
    });

    const superAdmin = organisation.users[0];
    if (superAdmin) {
      await sendOrgRejectedEmail(
        superAdmin.email,
        organisation.name,
        reason.trim()
      ).catch((err) => console.error('sendOrgRejectedEmail error:', err));
    }

    return res.status(200).json({ message: 'Organisation rejected successfully' });

  } catch (err) {
    console.error('rejectOrganisation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── DISABLE ORGANISATION ─────────────────────────────────────────────────────

export const disableOrganisation = async (req, res) => {
  try {
    const { id } = req.params;

    const organisation = await prisma.organisation.findUnique({
      where:   { id },
      include: {
        users: {
          where:  { role: 'ORG_SUPER_ADMIN' },
          select: { email: true }
        }
      }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    if (organisation.status === 'DISABLED') {
      return res.status(400).json({ message: 'Organisation is already disabled' });
    }

    if (organisation.status === 'PENDING' || organisation.status === 'REJECTED') {
      return res.status(400).json({
        message: 'Only approved organisations can be disabled'
      });
    }

    // Disable the org and all its users in a transaction
    await prisma.$transaction([
      prisma.organisation.update({
        where: { id },
        data: {
          status:      'DISABLED',
          disabled_at: new Date()
        }
      }),
      prisma.orgUser.updateMany({
        where: { org_id: id },
        data:  { status: 'DISABLED' }
      })
    ]);

    const superAdmin = organisation.users[0];
    if (superAdmin) {
      await sendOrgDisabledEmail(
        superAdmin.email,
        organisation.name
      ).catch((err) => console.error('sendOrgDisabledEmail error:', err));
    }

    return res.status(200).json({ message: 'Organisation disabled successfully' });

  } catch (err) {
    console.error('disableOrganisation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── ENABLE ORGANISATION ──────────────────────────────────────────────────────

export const enableOrganisation = async (req, res) => {
  try {
    const { id } = req.params;

    const organisation = await prisma.organisation.findUnique({
      where: { id }
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation not found' });
    }

    if (organisation.status !== 'DISABLED') {
      return res.status(400).json({
        message: `Only disabled organisations can be enabled. Current status: ${organisation.status}`
      });
    }

    await prisma.$transaction([
      prisma.organisation.update({
        where: { id },
        data: {
          status:      'APPROVED',
          disabled_at: null
        }
      }),
      prisma.orgUser.updateMany({
        where: { org_id: id },
        data:  { status: 'ACTIVE' }
      })
    ]);

    return res.status(200).json({ message: 'Organisation enabled successfully' });

  } catch (err) {
    console.error('enableOrganisation error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GET ANALYTICS ────────────────────────────────────────────────────────────

export const getAnalytics = async (req, res) => {
  try {
    const [total, approved, pending, rejected, disabled] = await Promise.all([
      prisma.organisation.count(),
      prisma.organisation.count({ where: { status: 'APPROVED'  } }),
      prisma.organisation.count({ where: { status: 'PENDING'   } }),
      prisma.organisation.count({ where: { status: 'REJECTED'  } }),
      prisma.organisation.count({ where: { status: 'DISABLED'  } })
    ]);

    return res.status(200).json({
      totalOrganisations: total,
      approved,
      pending,
      rejected,
      disabled
    });

  } catch (err) {
    console.error('getAnalytics error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};