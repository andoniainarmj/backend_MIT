const express = require("express");
const router = express.Router();
const {
  createFormation,
  getFormations,
  getFormationById,
  updateFormation,
  deleteFormation,
} = require("../controllers/formationController");

router.post("/", createFormation);
router.get("/", getFormations);
router.get("/:id", getFormationById);
router.put("/:id", updateFormation);
router.delete("/:id", deleteFormation);

module.exports = router;
