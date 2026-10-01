const express = require("express");
const router = express.Router();
const {
  createEntreprise,
  getEntreprises,
  getEntrepriseById,
  updateEntreprise,
  deleteEntreprise,
} = require("../controllers/entrepriseController");

router.post("/", createEntreprise);
router.get("/", getEntreprises);
router.get("/:id", getEntrepriseById);
router.put("/:id", updateEntreprise);
router.delete("/:id", deleteEntreprise);

module.exports = router;
