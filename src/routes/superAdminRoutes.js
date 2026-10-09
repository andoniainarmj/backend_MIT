const express = require("express");
const router = express.Router();
const {
  getVueEnsemble,
  getAdministrateurs,
  getLogs,
  exporterLogs,
  getSessionsActives,
  deconnecterSession,
  deconnexionGlobale,
  getConnexionsEchouees,
  getConfiguration,
  updateConfiguration,
} = require("../controllers/superAdminController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { tracer } = require("../utils/journal");

// authorizeRoles() sans rôle : seul le super_admin passe
router.use(protect, authorizeRoles());

router.get("/vue-ensemble", getVueEnsemble);
router.get("/administrateurs", getAdministrateurs);

router.get("/logs", getLogs);
router.get("/logs/export", exporterLogs);

router.get("/sessions", getSessionsActives);
router.put(
  "/sessions/deconnexion-globale",
  tracer("Déconnexion globale", "WARNING"),
  deconnexionGlobale,
);
router.put(
  "/sessions/:id/deconnecter",
  tracer("Déconnexion d'une session", "WARNING"),
  deconnecterSession,
);
router.get("/connexions-echouees", getConnexionsEchouees);

router.get("/configuration", getConfiguration);
router.put(
  "/configuration",
  tracer("Modification de la configuration", "WARNING"),
  updateConfiguration,
);

module.exports = router;
