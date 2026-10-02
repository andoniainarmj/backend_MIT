const express = require("express");
const router = express.Router();
const {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} = require("../controllers/documentController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");

router.get("/", protect, getDocuments);
router.get("/:id", protect, getDocumentById);
router.post("/", protect, authorizeRoles("admin"), createDocument);
router.put("/:id", protect, authorizeRoles("admin"), updateDocument);
router.delete("/:id", protect, authorizeRoles("admin"), deleteDocument);

module.exports = router;
