import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const handleRefreshToken = async (req, res) => {
  // Check if refresh token exists in cookie
  if (!req.cookies?.jwt) return res.status(401).json({ "message": "No refresh token" });
  
  const refreshToken = req.cookies.jwt;
  const { deviceId } = req.body;

  try {
    // Verify the refresh token exists in database
    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        ...(deviceId && { device_id: deviceId })
      },
      include: {
        user: true
      }
    });

    if (!tokenRecord) {
      return res.status(403).json({ "message": "Invalid refresh token" });
    }

    // Verify JWT signature
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ "message": "Token expired or invalid" });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { userId: decoded.userId, role: decoded.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '30m' }
      );

      return res.status(200).json({ accessToken });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ "message": "Token refresh failed" });
  }
};

export default handleRefreshToken;
