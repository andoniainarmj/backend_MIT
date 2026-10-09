const express = require("express");
const router = express.Router();
const {
  createInscription,
  getInscriptions,
  getInscriptionById,
  getMesInscriptions,
  updateInscription,
  deleteInscription,
} = require("../controllers/inscriptionController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get(
  "/mes-inscriptions",
  protect,
  authorizeRoles("etudiant"),
  getMesInscriptions,
);

router.post(
  "/",
  protect,
  authorizeRoles("etudiant", "admin"),
  createInscription,
);
router.get("/", protect, authorizeRoles("admin"), getInscriptions);
router.get("/:id", protect, getInscriptionById);
router.put("/:id", protect, authorizeRoles("admin"), updateInscription);
router.delete("/:id", protect, authorizeRoles("admin"), deleteInscription);

module.exports = router;
