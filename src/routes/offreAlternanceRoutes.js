const express = require("express");
const router = express.Router();
const {
  createOffre,
  getOffres,
  getOffreById,
  updateOffre,
  deleteOffre,
} = require("../controllers/offreAlternanceController");

router.post("/", createOffre);
router.get("/", getOffres);
router.get("/:id", getOffreById);
router.put("/:id", updateOffre);
router.delete("/:id", deleteOffre);

module.exports = router;
