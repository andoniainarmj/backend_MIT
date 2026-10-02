const express = require("express");

const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { uploadFichier } = require("../middlewares/uploadMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", protect, getMe);
router.put("/me", protect, uploadFichier("photo"), updateMe);

router.post("/", protect, authorizeRoles("admin"), createUser);
router.get("/", protect, authorizeRoles("admin"), getUsers);
router.get("/:id", protect, authorizeRoles("admin"), getUserById);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  uploadFichier("photo"),
  updateUser,
);
router.delete("/:id", protect, authorizeRoles("admin"), deleteUser);

module.exports = router;
