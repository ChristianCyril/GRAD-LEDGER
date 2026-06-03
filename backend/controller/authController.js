import bcrypt from 'bcrypt'
import crypto from 'crypto';
import prisma from "../config/prisma.js";
import { signAccessToken, signRefreshToken,verifyRefreshToken, } from "../service/jwtServices.js";
import { sendPasswordResetEmail } from "../service/emailService.js";


//For Platform Super Admin
export const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email },
    });

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    const isMatch = await bcrypt.compare(password, superAdmin.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const payload = {
      userId: superAdmin.id,
      role: "SUPER_ADMIN",
      email: superAdmin.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        user_id: superAdmin.id,
        user_role: "SUPER_ADMIN",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Send refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: {
          id: superAdmin.id,
          email: superAdmin.email,
          role: "SUPER_ADMIN",
        },
      },
    });
  } catch (error) {
    console.error("loginSuperAdmin error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//For Org Users
export const loginOrgUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const orgUser = await prisma.orgUser.findUnique({
      where: { email },
      include: {
        organisation: true,
      },
    });

    if (!orgUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (orgUser.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

    if (orgUser.organisation.status !== "APPROVED") {
      return res.status(403).json({
        success: false,
        message: "Organisation is not approved",
      });
    }

    const isMatch = await bcrypt.compare(password, orgUser.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const payload = {
      userId: orgUser.id,
      role: orgUser.role,
      email: orgUser.email,
      orgId: orgUser.org_id,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        user_id: orgUser.id,
        user_role: orgUser.role,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: {
          id: orgUser.id,
          full_name: orgUser.full_name,
          email: orgUser.email,
          role: orgUser.role,
          org_id: orgUser.org_id,
          organisation: {
            name: orgUser.organisation.name,
            code: orgUser.organisation.code,
          },
        },
      },
    });
  } catch (error) {
    console.error("loginOrgUser error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const storedTokens = await prisma.refreshToken.findMany({
      where: {
        user_id: decoded.userId,
        user_role: decoded.role,
      },
    });

    if (!storedTokens.length) {
      return res.status(401).json({
        success: false,
        message: "Session not found",
      });
    }

    let matchedToken = null;

    for (const tokenRecord of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token);
      if (isMatch) {
        matchedToken = tokenRecord;
        break;
      }
    }

    if (!matchedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (new Date() > matchedToken.expires_at) {
      await prisma.refreshToken.delete({
        where: { id: matchedToken.id },
      });

      return res.status(401).json({
        success: false,
        message: "Refresh token expired",
      });
    }

    const newPayload = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
      ...(decoded.orgId && { orgId: decoded.orgId }),
    };

    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    await prisma.refreshToken.update({
      where: { id: matchedToken.id },
      data: {
        token: hashedNewRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Fetch user based on role
    let user;

    if (decoded.role === "SUPER_ADMIN") {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
        },
      });

      user = {
        id: superAdmin.id,
        email: superAdmin.email,
        role: "SUPER_ADMIN",
      };

    } else {
      const orgUser = await prisma.orgUser.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          full_name: true,
          email: true,
          role: true,
          org_id: true,
          organisation: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      });

      user = {
        id: orgUser.id,
        full_name: orgUser.full_name,
        email: orgUser.email,
        role: orgUser.role,
        org_id: orgUser.org_id,
        organisation: {
          name: orgUser.organisation.name,
          code: orgUser.organisation.code,
        },
      };
    }

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Access token refreshed",
      data: {
        accessToken: newAccessToken,
        user,
      },
    });

  } catch (error) {
    console.error("refreshAccessToken error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      res.clearCookie("refreshToken");
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    }

    // Fetch only tokens belonging to this user
    const userTokens = await prisma.refreshToken.findMany({
      where: {
        user_id: decoded.userId,
        user_role: decoded.role,
      },
    });

    // Find matching hashed token
    let matchedToken = null;

    for (const tokenRecord of userTokens) {
      const isMatch = await bcrypt.compare(
        refreshToken,
        tokenRecord.token
      );

      if (isMatch) {
        matchedToken = tokenRecord;
        break;
      }
    }

    if (matchedToken) {
      await prisma.refreshToken.delete({
        where: {
          id: matchedToken.id,
        },
      });
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// ─── FORGOT PASSWORD ─────────────────────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.orgUser.findUnique({ where: { email } });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = await bcrypt.hash(resetToken, 10);
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.orgUser.update({
        where: { id: user.id },
        data: {
          password_reset_token: hashedToken,
          password_reset_expires: expires,
        },
      });

      await sendPasswordResetEmail(email, resetToken);
    }

    return res.status(200).json({
      message: "If this email exists, a reset link has been sent",
    });

  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── RESET PASSWORD ─────────────────────────────────────

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    // get candidates (cannot query directly because token is hashed)
    const users = await prisma.orgUser.findMany({
      where: {
        password_reset_expires: { gt: new Date() },
        password_reset_token: { not: null },
      },
    });

    let matchedUser = null;

    for (const user of users) {
      const isMatch = await bcrypt.compare(token, user.password_reset_token);
      if (isMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await prisma.orgUser.update({
      where: { id: matchedUser.id },
      data: {
        password_hash,
        password_reset_token: null,
        password_reset_expires: null,
      },
    });

    return res.status(200).json({
      message: "Password reset successful",
    });

  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─── CHANGE PASSWORD ────────────────────────────────────

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must differ from current password",
      });
    }

    let user;

    if(req.user.role === 'SUPER_ADMIN'){
      user = await prisma.superAdmin.findUnique({
      where: { id: req.user.id },
    });
    }else{
      user = await prisma.orgUser.findUnique({
      where: { id: req.user.id },
    });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (req.user.role !== 'SUPER_ADMIN' && user.status !== "ACTIVE") {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    if(req.user.role === 'SUPER_ADMIN'){
       await prisma.superAdmin.update({
      where: { id: user.id },
      data: {
        password_hash: await bcrypt.hash(newPassword, 10),
      },
    });
    
    }else{
       await prisma.orgUser.update({
      where: { id: user.id },
      data: {
        password_hash: await bcrypt.hash(newPassword, 10),
      },
    });
    
    }

    return res.status(200).json({
      message: "Password changed successfully",
    });

  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};