const express = require("express");
const router = express.Router();
const {
  createDocument,
  getDocumentsPublics,
  getMesDocuments,
  getTousDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} = require("../controllers/documentController");
const { protect, authorizeRoles } = require("../middlewares/authMiddleware");
const { uploadFichier } = require("../middlewares/uploadMiddleware");

router.get("/", getDocumentsPublics);
router.get("/mes-documents", protect, getMesDocuments);
router.get("/tous", protect, authorizeRoles("admin"), getTousDocuments);
router.get("/:id", protect, getDocumentById);

router.post(
  "/",
  protect,
  authorizeRoles("admin", "enseignant", "etudiant"),
  uploadFichier("fichier"),
  createDocument,
);
router.put("/:id", protect, uploadFichier("fichier"), updateDocument);
router.delete("/:id", protect, deleteDocument);

module.exports = router;
