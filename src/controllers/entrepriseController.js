const mongoose = require("mongoose");
const Entreprise = require("../models/Entreprise");

exports.createEntreprise = async (req, res) => {
  try {
    const entreprise = await Entreprise.create(req.body);
    res.status(201).json(entreprise);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getEntreprises = async (req, res) => {
  try {
    const entreprises = await Entreprise.find();
    res.status(200).json(entreprises);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getEntrepriseById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const entreprise = await Entreprise.findById(req.params.id);
    if (!entreprise) {
      return res.status(404).json({ message: "Entreprise introuvable" });
    }
    res.status(200).json(entreprise);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateEntreprise = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const entreprise = await Entreprise.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!entreprise) {
      return res.status(404).json({ message: "Entreprise introuvable" });
    }
    res.status(200).json(entreprise);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteEntreprise = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const entreprise = await Entreprise.findByIdAndDelete(req.params.id);
    if (!entreprise) {
      return res.status(404).json({ message: "Entreprise introuvable" });
    }
    res.status(200).json({ message: "Entreprise supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
