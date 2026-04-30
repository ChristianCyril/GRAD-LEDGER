import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';


const handleAuthentication = async (req, res) => {
  if (!req.body?.email || !req.body?.password) return res.status(400).json({ "message": "Email and Password required" });
  const { email, password, deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ "message": "Device ID required" });
  //finding the user
  const foundUser = await prisma.user.findUnique({
      where: { email }
    });
  if (!foundUser) return res.status(401).json({ "message": "Invalid credentials" });
  //checking password
  const match = await bcrypt.compare(password, foundUser.password);
  if (!match) return res.status(401).json({ "message": "Invalid credentials" });
  // granting access and refresh token 
  const accessToken = jwt.sign(
    { userId: foundUser.user_id, role: foundUser.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '30m' }
  );
  const refreshToken = jwt.sign(
    { userId: foundUser.user_id,role: foundUser.role  },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '12h' }
  );
  //sending refresh token as http only cookie
  res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 12 * 60 * 60 * 1000 });
  // saving refresh token
  try {
    // Delete old token for this device to prevent zombie tokens
    await prisma.refreshToken.deleteMany({
      where: { 
        user_id: foundUser.user_id,
        device_id: deviceId
      }
    });

    // Create new token for this device
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: foundUser.user_id,
        device_id: deviceId,
        user_agent: req.headers['user-agent']
      }
    });
    res.status(200).json({
      accessToken: accessToken,
      role: foundUser.role,
      id: foundUser.user_id ,
      firstname: foundUser.first_name ,
      lastname: foundUser.last_name
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ "message": "Authentication failed" });
  }
}

export default handleAuthentication;