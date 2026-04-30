const verifyRoles = (userRole)=>{
  return (req,res, next)=>{
    if(!req.role) return res.sendStatus(403);
    if(req.role !== userRole) return res.sendStatus(403);
    next();
}
}


export default verifyRoles;