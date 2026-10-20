const express = require("express");
const router = express.Router();
const {
  getCreneaux,
  createRendezVous,
  getRendezVous,
  getRendezVousById,
  confirmerRendezVous,
  refuserRendezVous,
  deleteRendezVous,
} = require("../controllers/rendezVousController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { tracer } = require("../utils/journal");

router.get("/creneaux", getCreneaux);
router.post("/", createRendezVous);

router.get("/", protect, authorizeRoles("admin"), getRendezVous);
router.get("/:id", protect, authorizeRoles("admin"), getRendezVousById);
router.put(
  "/:id/confirmer",
  protect,
  authorizeRoles("admin"),
  tracer("Confirmation de rendez-vous"),
  confirmerRendezVous,
);
router.put(
  "/:id/refuser",
  protect,
  authorizeRoles("admin"),
  tracer("Refus de rendez-vous"),
  refuserRendezVous,
);
router.delete("/:id", protect, authorizeRoles("admin"), deleteRendezVous);

module.exports = router;
