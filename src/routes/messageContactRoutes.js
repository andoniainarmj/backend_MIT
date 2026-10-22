const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessages,
  getMessageById,
  updateMessage,
  repondreMessage,
  deleteMessage,
} = require("../controllers/messageContactController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { tracer } = require("../utils/journal");

router.post("/", createMessage);
router.get("/", protect, authorizeRoles("admin"), getMessages);
router.get("/:id", protect, authorizeRoles("admin"), getMessageById);
router.post(
  "/:id/repondre",
  protect,
  authorizeRoles("admin"),
  tracer("Réponse à un message de contact"),
  repondreMessage,
);
router.put("/:id", protect, authorizeRoles("admin"), updateMessage);
router.delete("/:id", protect, authorizeRoles("admin"), deleteMessage);

module.exports = router;
