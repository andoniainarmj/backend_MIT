const mongoose = require("mongoose");
const Salle = require("../models/Salle");
const Seance = require("../models/Seance");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(id);

exports.createSalle = async (req, res) => {
  try {
    const salle = await Salle.create(req.body);
    res.status(201).json(salle);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getSalles = async (req, res) => {
  try {
    const salles = await Salle.find().sort({ nom: 1 });
    res.status(200).json(salles);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getSalleById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const salle = await Salle.findById(req.params.id);
    if (!salle) {
      return res.status(404).json({ message: "Salle introuvable" });
    }
    res.status(200).json(salle);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateSalle = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const salle = await Salle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!salle) {
      return res.status(404).json({ message: "Salle introuvable" });
    }
    res.status(200).json(salle);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteSalle = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const salle = await Salle.findByIdAndDelete(req.params.id);
    if (!salle) {
      return res.status(404).json({ message: "Salle introuvable" });
    }
    res.status(200).json({ message: "Salle supprimée" });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getSallesDisponibles = async (req, res) => {
  try {
    const debut = new Date(req.query.debut);
    const fin = new Date(req.query.fin);
    if (isNaN(debut) || isNaN(fin) || debut >= fin) {
      return res.status(400).json({ message: "Début et fin invalides" });
    }

    const occupees = await Seance.distinct("salle", {
      debut: { $lt: fin },
      fin: { $gt: debut },
    });
    const salles = await Salle.find({ _id: { $nin: occupees } }).sort({
      nom: 1,
    });
    res.status(200).json(salles);
  } catch (error) {
    gererErreur(error, res);
  }
};
