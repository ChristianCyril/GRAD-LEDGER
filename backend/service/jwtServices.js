import jwt from 'jsonwebtoken'


export const signAccessToken = (payload) =>
  jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn:'30m'
  });

export const signRefreshToken = (payload) =>
 jwt.sign(
  { ...payload, jti: crypto.randomUUID() },
  process.env.REFRESH_TOKEN_SECRET,
  { expiresIn: "7d" }
)

export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

export const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

