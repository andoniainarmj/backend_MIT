const express = require("express");
const router = express.Router();
const {
  createFormation,
  getFormations,
  getFormationById,
  updateFormation,
  deleteFormation,
} = require("../controllers/formationController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", getFormations);
router.get("/:id", getFormationById);
router.post("/", protect, authorizeRoles("admin"), createFormation);
router.put("/:id", protect, authorizeRoles("admin"), updateFormation);
router.delete("/:id", protect, authorizeRoles("admin"), deleteFormation);

module.exports = router;
