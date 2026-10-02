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
const { uploadFichier } = require("../middlewares/uploadMiddleware");

router.get("/", protect, getDocuments);
router.get("/:id", protect, getDocumentById);
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  uploadFichier("fichier"),
  createDocument,
);
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  uploadFichier("fichier"),
  updateDocument,
);
router.delete("/:id", protect, authorizeRoles("admin"), deleteDocument);

module.exports = router;
