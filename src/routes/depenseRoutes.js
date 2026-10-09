const express = require("express");
const router = express.Router();
const {
  createDepense,
  getDepenses,
  updateDepense,
  deleteDepense,
} = require("../controllers/depenseController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, authorizeRoles("admin"), getDepenses);
router.post("/", protect, authorizeRoles("admin"), createDepense);
router.put("/:id", protect, authorizeRoles("admin"), updateDepense);
router.delete("/:id", protect, authorizeRoles("admin"), deleteDepense);

module.exports = router;
