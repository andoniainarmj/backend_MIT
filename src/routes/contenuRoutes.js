const express = require("express");
const router = express.Router();
const {
  getPage,
  getSection,
  listerContenus,
  enregistrerSection,
  supprimerSection,
} = require("../controllers/contenuController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { tracer } = require("../utils/journal");

router.get("/", protect, authorizeRoles("admin"), listerContenus);

router.get("/:page", getPage);
router.get("/:page/:section", getSection);

router.put("/:page/:section", protect, authorizeRoles("admin"), tracer("Modification du contenu d'une page"), enregistrerSection);
router.delete("/:page/:section", protect, authorizeRoles("admin"), tracer("Suppression d'une section de page", "WARNING"), supprimerSection);

module.exports = router;