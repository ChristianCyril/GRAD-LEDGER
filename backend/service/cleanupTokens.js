import prisma from "../config/prisma.js";

export const cleanupExpiredTokens = async () => {
  const result = await prisma.refreshToken.deleteMany({
    where: { expires_at: { lt: new Date() } }
  });
  console.log(`[CleanupJob] Deleted ${result.count} expired refresh token(s)`);
};