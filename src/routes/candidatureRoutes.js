const express = require("express");
const router = express.Router();
const {
  createCandidature,
  getCandidatures,
  getCandidatureById,
  updateCandidature,
  deleteCandidature,
} = require("../controllers/candidatureController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { uploadFichier } = require("../middlewares/uploadMiddleware");

router.post(
  "/",
  protect,
  authorizeRoles("etudiant", "admin"),
  uploadFichier("cv"),
  createCandidature,
);
router.get(
  "/",
  protect,
  authorizeRoles("admin", "entreprise"),
  getCandidatures,
);
router.get("/:id", protect, getCandidatureById);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin", "entreprise"),
  updateCandidature,
);
router.delete("/:id", protect, authorizeRoles("admin"), deleteCandidature);

module.exports = router;
