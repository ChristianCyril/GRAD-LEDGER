import prisma from "../config/prisma.js";


export const getAuditLog = async (req, res) => {
  try {
    const { role, id: callerId, orgId } = req.user;

    const {
      action,
      actor_id,
      from,
      to,
      page  = '1',
      limit = '20',
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page,  10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip     = (pageNum - 1) * limitNum;

    // ── Build where clause ────────────────────────────────────────────────────

    const where = {
      org_id: orgId,
    };

    // Role-based scope: Org Admin is locked to their own entries only
    if (role === 'ORG_ADMIN') {
      where.actor_id = callerId;
    } else {
      // ORG_SUPER_ADMIN: optionally filter by a specific actor
      if (actor_id) {
        where.actor_id = actor_id;
      }
    }

    // Filter by action type (e.g. CERTIFICATE_ISSUED, ADMIN_CREATED …)
    if (action) {
      where.action = action;
    }

    // Filter by date range on created_at
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at.gte = new Date(from);
      if (to)   where.created_at.lte = new Date(to);
    }

    // ── Query ─────────────────────────────────────────────────────────────────

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id:        true,
              full_name: true,
              email:     true,
              role:      true,
              job_title: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.status(200).json({
      data:  logs,
      total,
      page:  pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error('[getAuditLog]', err);
    return res.status(500).json({ message: 'Failed to retrieve audit log.' });
  }
};