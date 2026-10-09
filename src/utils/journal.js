const Log = require("../models/Log");

const enregistrerLog = async (donnees) => {
  try {
    await Log.create(donnees);
  } catch (error) {
    console.error("Erreur journal :", error.message);
  }
};

// À placer dans une route : enregistre l'action si elle a réussi
const tracer =
  (action, severite = "INFO") =>
  (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        enregistrerLog({
          utilisateur: req.user ? req.user.id : undefined,
          action,
          details: `${req.method} ${req.originalUrl}`,
          ip: req.ip,
          severite,
        });
      }
    });
    next();
  };

module.exports = { enregistrerLog, tracer };
