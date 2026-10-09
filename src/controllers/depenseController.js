const mongoose = require("mongoose");
const Depense = require("../models/Depense");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));

exports.createDepense = async (req, res) => {
  try {
    const depense = await Depense.create(req.body);
    res.status(201).json(depense);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getDepenses = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.departement) filtre.departement = req.query.departement;
    const depenses = await Depense.find(filtre).sort({ date: -1 });
    res.status(200).json(depenses);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateDepense = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const depense = await Depense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!depense) {
      return res.status(404).json({ message: "Dépense introuvable" });
    }
    res.status(200).json(depense);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteDepense = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const depense = await Depense.findByIdAndDelete(req.params.id);
    if (!depense) {
      return res.status(404).json({ message: "Dépense introuvable" });
    }
    res.status(200).json({ message: "Dépense supprimée" });
  } catch (error) {
    gererErreur(error, res);
  }
};
