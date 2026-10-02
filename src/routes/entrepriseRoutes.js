const express = require("express");
const router = express.Router();
const {
  createEntreprise,
  getEntreprises,
  getEntrepriseById,
  updateEntreprise,
  deleteEntreprise,
} = require("../controllers/entrepriseController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", getEntreprises);
router.get("/:id", getEntrepriseById);
router.post("/", protect, authorizeRoles("admin"), createEntreprise);
router.put("/:id", protect, authorizeRoles("admin"), updateEntreprise);
router.delete("/:id", protect, authorizeRoles("admin"), deleteEntreprise);

module.exports = router;