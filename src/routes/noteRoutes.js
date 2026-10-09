const express = require("express");
const router = express.Router();
const {
  saisirNotes,
  getNotesCours,
  validerNotes,
  getMesNotes,
  deleteNote,
} = require("../controllers/noteController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/mes-notes", protect, authorizeRoles("etudiant"), getMesNotes);
router.get(
  "/cours/:coursId",
  protect,
  authorizeRoles("admin", "enseignant"),
  getNotesCours,
);
router.post(
  "/saisie",
  protect,
  authorizeRoles("admin", "enseignant"),
  saisirNotes,
);
router.put("/valider", protect, authorizeRoles("admin"), validerNotes);
router.delete("/:id", protect, authorizeRoles("admin"), deleteNote);

module.exports = router;
