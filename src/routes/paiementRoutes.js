const express = require("express");
const router = express.Router();
const {
  createPaiement,
  getPaiements,
  getMesPaiements,
  getStats,
  updatePaiement,
  payerPaiement,
  deletePaiement,
} = require("../controllers/paiementController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get(
  "/mes-paiements",
  protect,
  authorizeRoles("etudiant"),
  getMesPaiements,
);
router.get("/stats", protect, authorizeRoles("admin"), getStats);

router.get("/", protect, authorizeRoles("admin"), getPaiements);
router.post("/", protect, authorizeRoles("admin"), createPaiement);
router.put("/:id/payer", protect, authorizeRoles("admin"), payerPaiement);
router.put("/:id", protect, authorizeRoles("admin"), updatePaiement);
router.delete("/:id", protect, authorizeRoles("admin"), deletePaiement);

module.exports = router;
