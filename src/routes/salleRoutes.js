const express = require("express");
const router = express.Router();
const {
  createSalle,
  getSalles,
  getSalleById,
  updateSalle,
  deleteSalle,
  getSallesDisponibles,
} = require("../controllers/salleController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, getSalles);
router.get("/disponibles", protect, getSallesDisponibles);
router.get("/:id", protect, getSalleById);
router.post("/", protect, authorizeRoles("admin"), createSalle);
router.put("/:id", protect, authorizeRoles("admin"), updateSalle);
router.delete("/:id", protect, authorizeRoles("admin"), deleteSalle);

module.exports = router;
