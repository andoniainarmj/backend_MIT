const mongoose = require("mongoose");
const OffreAlternance = require("../models/OffreAlternance");
const Entreprise = require("../models/Entreprise");

exports.createOffre = async (req, res) => {
  try {
    const { entreprise } = req.body;
    if (!entreprise || !mongoose.Types.ObjectId.isValid(entreprise)) {
      return res.status(400).json({ message: "Entreprise invalide" });
    }
    const entrepriseExiste = await Entreprise.findById(entreprise);
    if (!entrepriseExiste) {
      return res.status(404).json({ message: "Entreprise introuvable" });
    }
    const offre = await OffreAlternance.create(req.body);
    res.status(201).json(offre);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getOffres = async (req, res) => {
  try {
    const offres = await OffreAlternance.find().populate("entreprise", "nom");
    res.status(200).json(offres);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getOffreById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const offre = await OffreAlternance.findById(req.params.id).populate(
      "entreprise",
      "nom",
    );
    if (!offre) {
      return res.status(404).json({ message: "Offre introuvable" });
    }
    res.status(200).json(offre);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateOffre = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    if (req.body.entreprise) {
      if (!mongoose.Types.ObjectId.isValid(req.body.entreprise)) {
        return res.status(400).json({ message: "Entreprise invalide" });
      }
      const entrepriseExiste = await Entreprise.findById(req.body.entreprise);
      if (!entrepriseExiste) {
        return res.status(404).json({ message: "Entreprise introuvable" });
      }
    }
    const offre = await OffreAlternance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!offre) {
      return res.status(404).json({ message: "Offre introuvable" });
    }
    res.status(200).json(offre);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteOffre = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const offre = await OffreAlternance.findByIdAndDelete(req.params.id);
    if (!offre) {
      return res.status(404).json({ message: "Offre introuvable" });
    }
    res.status(200).json({ message: "Offre supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
