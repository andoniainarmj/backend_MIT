const express = require("express");
const router = express.Router();
const {
  createInscription,
  getInscriptions,
  getInscriptionById,
  updateInscription,
  deleteInscription,
} = require("../controllers/inscriptionController");

router.post("/", createInscription);
router.get("/", getInscriptions);
router.get("/:id", getInscriptionById);
router.put("/:id", updateInscription);
router.delete("/:id", deleteInscription);

module.exports = router;
