const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (req.user.role === "super_admin" || roles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: "Accès refusé" });
  };
};

module.exports = { protect, authorizeRoles };
