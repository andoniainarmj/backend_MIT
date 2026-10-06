const express = require("express");
const router = express.Router();

const {
  createAbsence,
  getAbsences,
  getMesAbsences,
  getAbsenceById,
  updateAbsence,
  deleteAbsence,
} = require("../controllers/absenceController");

const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get(
  "/mes-absences",
  protect,
  authorizeRoles("etudiant"),
  getMesAbsences,
);

router.post("/", protect, authorizeRoles("admin", "enseignant"), createAbsence);

router.get("/", protect, authorizeRoles("admin", "enseignant"), getAbsences);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin", "enseignant"),
  getAbsenceById,
);

router.put("/:id", protect, authorizeRoles("admin"), updateAbsence);

router.delete("/:id", protect, authorizeRoles("admin"), deleteAbsence);

module.exports = router;
