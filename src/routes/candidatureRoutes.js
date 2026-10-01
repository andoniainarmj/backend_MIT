const express = require("express");
const router = express.Router();
const {
  createCandidature,
  getCandidatures,
  getCandidatureById,
  updateCandidature,
  deleteCandidature,
} = require("../controllers/candidatureController");

router.post("/", createCandidature);
router.get("/", getCandidatures);
router.get("/:id", getCandidatureById);
router.put("/:id", updateCandidature);
router.delete("/:id", deleteCandidature);

module.exports = router;
