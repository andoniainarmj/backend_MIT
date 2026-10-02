const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
} = require("../controllers/messageContactController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.post("/", createMessage);
router.get("/", protect, authorizeRoles("admin"), getMessages);
router.get("/:id", protect, authorizeRoles("admin"), getMessageById);
router.put("/:id", protect, authorizeRoles("admin"), updateMessage);
router.delete("/:id", protect, authorizeRoles("admin"), deleteMessage);

module.exports = router;