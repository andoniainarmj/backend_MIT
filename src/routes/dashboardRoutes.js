const express = require("express");
const router = express.Router();
const {
  getDashboardEtudiant,
  getDashboardAdmin,
} = require("../controllers/dashboardController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get(
  "/etudiant",
  protect,
  authorizeRoles("etudiant"),
  getDashboardEtudiant,
);
router.get("/admin", protect, authorizeRoles("admin"), getDashboardAdmin);

module.exports = router;
