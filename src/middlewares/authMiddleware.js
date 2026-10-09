const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const { obtenirConfig } = require("../utils/configuration");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant" });
  }

  let payload;
  try {
    payload = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }

  try {
    if (!payload.sid) {
      return res
        .status(401)
        .json({ message: "Session invalide, reconnectez-vous" });
    }

    const session = await Session.findById(payload.sid);
    if (!session || !session.active) {
      return res.status(401).json({ message: "Session expirée ou révoquée" });
    }

    const config = await obtenirConfig();
    if (config.mode_maintenance && payload.role !== "super_admin") {
      return res
        .status(503)
        .json({ message: "Plateforme en maintenance, réessayez plus tard" });
    }

    session.derniere_activite = new Date();
    await session.save();

    req.user = { id: payload.id, role: payload.role, sid: payload.sid };
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur serveur" });
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
