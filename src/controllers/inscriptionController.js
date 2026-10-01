const mongoose = require("mongoose");
const Inscription = require("../models/Inscription");
const User = require("../models/User");
const Formation = require("../models/Formation");

exports.createInscription = async (req, res) => {
  try {
    const { utilisateur, formation } = req.body;
    if (!utilisateur || !mongoose.Types.ObjectId.isValid(utilisateur)) {
      return res.status(400).json({ message: "Utilisateur invalide" });
    }
    if (!formation || !mongoose.Types.ObjectId.isValid(formation)) {
      return res.status(400).json({ message: "Formation invalide" });
    }
    if (!(await User.findById(utilisateur))) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }
    if (!(await Formation.findById(formation))) {
      return res.status(404).json({ message: "Formation introuvable" });
    }
    const inscription = await Inscription.create(req.body);
    res.status(201).json(inscription);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Déjà inscrit à cette formation" });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getInscriptions = async (req, res) => {
  try {
    const inscriptions = await Inscription.find()
      .populate("utilisateur", "nom prenom email")
      .populate("formation", "titre");
    res.status(200).json(inscriptions);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getInscriptionById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const inscription = await Inscription.findById(req.params.id)
      .populate("utilisateur", "nom prenom email")
      .populate("formation", "titre");
    if (!inscription) {
      return res.status(404).json({ message: "Inscription introuvable" });
    }
    res.status(200).json(inscription);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateInscription = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const inscription = await Inscription.findByIdAndUpdate(
      req.params.id,
      { statut: req.body.statut },
      { new: true, runValidators: true },
    );
    if (!inscription) {
      return res.status(404).json({ message: "Inscription introuvable" });
    }
    res.status(200).json(inscription);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteInscription = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const inscription = await Inscription.findByIdAndDelete(req.params.id);
    if (!inscription) {
      return res.status(404).json({ message: "Inscription introuvable" });
    }
    res.status(200).json({ message: "Inscription supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
