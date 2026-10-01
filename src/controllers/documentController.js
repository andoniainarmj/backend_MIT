const mongoose = require("mongoose");
const Document = require("../models/Document");
const Formation = require("../models/Formation");

exports.createDocument = async (req, res) => {
  try {
    const { formation } = req.body;
    if (!formation || !mongoose.Types.ObjectId.isValid(formation)) {
      return res.status(400).json({ message: "Formation invalide" });
    }
    const formationExiste = await Formation.findById(formation);
    if (!formationExiste) {
      return res.status(404).json({ message: "Formation introuvable" });
    }
    const document = await Document.create(req.body);
    res.status(201).json(document);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const documents = await Document.find().populate("formation", "titre");
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const document = await Document.findById(req.params.id).populate(
      "formation",
      "titre",
    );
    if (!document) {
      return res.status(404).json({ message: "Document introuvable" });
    }
    res.status(200).json(document);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    if (req.body.formation) {
      if (!mongoose.Types.ObjectId.isValid(req.body.formation)) {
        return res.status(400).json({ message: "Formation invalide" });
      }
      const formationExiste = await Formation.findById(req.body.formation);
      if (!formationExiste) {
        return res.status(404).json({ message: "Formation introuvable" });
      }
    }
    const document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!document) {
      return res.status(404).json({ message: "Document introuvable" });
    }
    res.status(200).json(document);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const document = await Document.findByIdAndDelete(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document introuvable" });
    }
    res.status(200).json({ message: "Document supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
