const express = require("express");
const router = express.Router();
const {
  getContacts,
  creerConversation,
  getMesConversations,
  getNonLus,
  getMessages,
  envoyerMessage,
  marquerLu,
  supprimerMessage,
} = require("../controllers/conversationController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.get("/contacts", getContacts);
router.get("/non-lus", getNonLus);
router.delete("/messages/:messageId", supprimerMessage);

router.get("/", getMesConversations);
router.post("/", creerConversation);
router.get("/:id/messages", getMessages);
router.post("/:id/messages", envoyerMessage);
router.put("/:id/lu", marquerLu);

module.exports = router;
