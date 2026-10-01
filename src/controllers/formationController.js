const mongoose = require("mongoose");
const Formation = require("../models/Formation");

exports.createFormation = async (req, res) => {
  try {
    const formation = await Formation.create(req.body);
    res.status(201).json(formation);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getFormations = async (req, res) => {
  try {
    const formations = await Formation.find();
    res.status(200).json(formations);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getFormationById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const formation = await Formation.findById(req.params.id);
    if (!formation) {
      return res.status(404).json({ message: "Formation introuvable" });
    }
    res.status(200).json(formation);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateFormation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const formation = await Formation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!formation) {
      return res.status(404).json({ message: "Formation introuvable" });
    }
    res.status(200).json(formation);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteFormation = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const formation = await Formation.findByIdAndDelete(req.params.id);
    if (!formation) {
      return res.status(404).json({ message: "Formation introuvable" });
    }
    res.status(200).json({ message: "Formation supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
