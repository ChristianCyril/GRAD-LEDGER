import prisma from "../config/prisma.js";

const handleLogout = async (req, res) => {
  if (!req.cookies?.jwt) return res.sendStatus(204);
  const refreshToken = req.cookies.jwt;
  const { deviceId } = req.body;
  
  try {
    // Find and delete the refresh token from database
    const deletedToken = await prisma.refreshToken.deleteMany({
      where: { 
        token: refreshToken,
        ...(deviceId && { device_id: deviceId })
      }
    });
    
    // Clear the JWT cookie
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    
    // Return 204 No Content for successful logout
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ "message": "Logout failed" });
  }
}

export default handleLogout;