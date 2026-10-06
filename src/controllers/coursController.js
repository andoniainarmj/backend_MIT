const mongoose = require("mongoose");
const Cours = require("../models/Cours");
const Formation = require("../models/Formation");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(id);

const verifierReferences = async (body) => {
  if (body.formation) {
    if (!idValide(body.formation)) {
      return { status: 400, message: "Formation invalide" };
    }
    if (!(await Formation.findById(body.formation))) {
      return { status: 404, message: "Formation introuvable" };
    }
  }
  if (body.enseignant) {
    if (!idValide(body.enseignant)) {
      return { status: 400, message: "Enseignant invalide" };
    }
    const enseignant = await User.findById(body.enseignant);
    if (!enseignant || enseignant.role !== "enseignant") {
      return { status: 404, message: "Enseignant introuvable" };
    }
  }
  return null;
};

exports.createCours = async (req, res) => {
  try {
    if (!req.body.formation) {
      return res.status(400).json({ message: "Formation obligatoire" });
    }
    const erreur = await verifierReferences(req.body);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const cours = await Cours.create(req.body);
    res.status(201).json(cours);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getCours = async (req, res) => {
  try {
    const filtre = {};
    ["formation", "niveau", "semestre", "enseignant"].forEach((champ) => {
      if (req.query[champ]) filtre[champ] = req.query[champ];
    });

    const cours = await Cours.find(filtre)
      .populate("formation", "titre")
      .populate("enseignant", "nom prenom")
      .sort({ titre: 1 });
    res.status(200).json(cours);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getCoursById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const cours = await Cours.findById(req.params.id)
      .populate("formation", "titre")
      .populate("enseignant", "nom prenom");
    if (!cours) {
      return res.status(404).json({ message: "Cours introuvable" });
    }
    res.status(200).json(cours);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateCours = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const erreur = await verifierReferences(req.body);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const cours = await Cours.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cours) {
      return res.status(404).json({ message: "Cours introuvable" });
    }
    res.status(200).json(cours);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteCours = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const cours = await Cours.findByIdAndDelete(req.params.id);
    if (!cours) {
      return res.status(404).json({ message: "Cours introuvable" });
    }
    res.status(200).json({ message: "Cours supprimé" });
  } catch (error) {
    gererErreur(error, res);
  }
};
