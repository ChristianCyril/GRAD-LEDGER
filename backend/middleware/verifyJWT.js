import jwt from 'jsonwebtoken';

const verifyJWT = (req,res,next)=>{
  const authHeader = req.headers['authorization' ]|| req.headers['Authorization'];
  if(!authHeader?.startsWith('Bearer ')) return res.status(401).json({"message": 'No Access Token'});
  const token = authHeader.split(' ')[1];
  //verify token
  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,
    (error,decoded)=>{
      if(error) return res.status(401).json({"message": 'Invalid Access Token'});
      req.role = decoded.role;
      req.userId = decoded.userId;
      next();
    }
  );
}

export default verifyJWT;
