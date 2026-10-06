const express = require("express");
const router = express.Router();
const {
  createSeance,
  getSeances,
  getMonPlanning,
  getSeanceById,
  updateSeance,
  publierSeances,
  deleteSeance,
} = require("../controllers/seanceController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get(
  "/mon-planning",
  protect,
  authorizeRoles("etudiant", "enseignant"),
  getMonPlanning,
);
router.put("/publier", protect, authorizeRoles("admin"), publierSeances);

router.get("/", protect, getSeances);
router.get("/:id", protect, getSeanceById);
router.post("/", protect, authorizeRoles("admin"), createSeance);
router.put("/:id", protect, authorizeRoles("admin"), updateSeance);
router.delete("/:id", protect, authorizeRoles("admin"), deleteSeance);

module.exports = router;
