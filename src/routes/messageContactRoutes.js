const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
} = require("../controllers/messageContactController");

router.post("/", createMessage);
router.get("/", getMessages);
router.get("/:id", getMessageById);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

module.exports = router;
