const express = require("express");
const router = express.Router();
const {
  createOffre,
  getOffres,
  getOffreById,
  updateOffre,
  deleteOffre,
} = require("../controllers/offreAlternanceController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", getOffres);
router.get("/:id", getOffreById);
router.post("/", protect, authorizeRoles("admin", "entreprise"), createOffre);
router.put("/:id", protect, authorizeRoles("admin", "entreprise"), updateOffre);
router.delete("/:id", protect, authorizeRoles("admin", "entreprise"), deleteOffre);

module.exports = router;