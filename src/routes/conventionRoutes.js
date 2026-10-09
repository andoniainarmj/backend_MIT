const express = require("express");
const router = express.Router();
const {
  createConvention,
  getConventions,
  getMesConventions,
  getStats,
  getConventionById,
  updateConvention,
  deleteConvention,
} = require("../controllers/conventionController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/stats", protect, authorizeRoles("admin"), getStats);
router.get(
  "/mes-conventions",
  protect,
  authorizeRoles("etudiant", "enseignant"),
  getMesConventions,
);

router.get("/", protect, authorizeRoles("admin"), getConventions);
router.get("/:id", protect, authorizeRoles("admin"), getConventionById);
router.post("/", protect, authorizeRoles("admin"), createConvention);
router.put("/:id", protect, authorizeRoles("admin"), updateConvention);
router.delete("/:id", protect, authorizeRoles("admin"), deleteConvention);

module.exports = router;
