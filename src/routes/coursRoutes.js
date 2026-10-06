const express = require("express");
const router = express.Router();
const {
  createCours,
  getCours,
  getCoursById,
  updateCours,
  deleteCours,
} = require("../controllers/coursController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, getCours);
router.get("/:id", protect, getCoursById);
router.post("/", protect, authorizeRoles("admin"), createCours);
router.put("/:id", protect, authorizeRoles("admin"), updateCours);
router.delete("/:id", protect, authorizeRoles("admin"), deleteCours);

module.exports = router;
