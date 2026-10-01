const mongoose = require("mongoose");
const Candidature = require("../models/Candidature");
const User = require("../models/User");
const OffreAlternance = require("../models/OffreAlternance");

exports.createCandidature = async (req, res) => {
  try {
    const { utilisateur, offre } = req.body;
    if (!utilisateur || !mongoose.Types.ObjectId.isValid(utilisateur)) {
      return res.status(400).json({ message: "Utilisateur invalide" });
    }
    if (!offre || !mongoose.Types.ObjectId.isValid(offre)) {
      return res.status(400).json({ message: "Offre invalide" });
    }
    if (!(await User.findById(utilisateur))) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    if (!(await OffreAlternance.findById(offre))) {
      return res.status(404).json({ message: "Offre introuvable" });
    }
    const candidature = await Candidature.create(req.body);
    res.status(201).json(candidature);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Déjà candidat à cette offre" });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getCandidatures = async (req, res) => {
  try {
    const candidatures = await Candidature.find()
      .populate("utilisateur", "nom prenom email")
      .populate("offre", "titre");
    res.status(200).json(candidatures);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getCandidatureById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const candidature = await Candidature.findById(req.params.id)
      .populate("utilisateur", "nom prenom email")
      .populate("offre", "titre");
    if (!candidature) {
      return res.status(404).json({ message: "Candidature introuvable" });
    }
    res.status(200).json(candidature);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateCandidature = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const candidature = await Candidature.findByIdAndUpdate(
      req.params.id,
      { statut: req.body.statut },
      { new: true, runValidators: true },
    );
    if (!candidature) {
      return res.status(404).json({ message: "Candidature introuvable" });
    }
    res.status(200).json(candidature);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteCandidature = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const candidature = await Candidature.findByIdAndDelete(req.params.id);
    if (!candidature) {
      return res.status(404).json({ message: "Candidature introuvable" });
    }
    res.status(200).json({ message: "Candidature supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
