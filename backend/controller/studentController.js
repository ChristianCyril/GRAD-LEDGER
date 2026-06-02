import prisma from '../config/prisma.js';

export const searchStudents = async (req, res) => {
  try {
    const { q } = req.query;
    const { orgId } = req.user;

    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, data: [] });
    }

    const students = await prisma.student.findMany({
      where: {
        org_id: orgId,
        OR: [
          { full_name: { contains: q, mode: 'insensitive' } },
          { matricule: { contains: q, mode: 'insensitive' } },
          { email:     { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id:        true,
        full_name: true,
        matricule: true,
        email:     true,
      },
      take: 5, // max 5 suggestions
    });

    return res.status(200).json({ success: true, data: students });
  } catch (err) {
    console.error('searchStudents error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};