const mongoose = require("mongoose");
const Absence = require("../models/Absence");
const Seance = require("../models/Seance");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));

const POPULATE = [
  { path: "etudiant", select: "nom prenom numero_etudiant" },
  { path: "seance", populate: { path: "cours", select: "titre" } },
];

exports.createAbsence = async (req, res) => {
  try {
    const { etudiant, seance, date, motif } = req.body;

    if (!etudiant || !idValide(etudiant)) {
      return res.status(400).json({ message: "Étudiant invalide" });
    }

    const user = await User.findById(etudiant);

    if (!user || user.role !== "etudiant") {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }

    if (seance) {
      if (!idValide(seance)) {
        return res.status(400).json({ message: "Séance invalide" });
      }

      if (!(await Seance.findById(seance))) {
        return res.status(404).json({ message: "Séance introuvable" });
      }

      if (await Absence.findOne({ etudiant, seance })) {
        return res.status(409).json({
          message: "Absence déjà enregistrée pour cette séance",
        });
      }
    }

    const absence = await Absence.create({
      etudiant,
      seance,
      date,
      motif,
    });

    res.status(201).json(absence);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getAbsences = async (req, res) => {
  try {
    const filtre = {};

    if (req.query.etudiant) {
      filtre.etudiant = req.query.etudiant;
    }

    if (req.query.justifiee !== undefined) {
      filtre.justifiee = req.query.justifiee === "true";
    }

    const absences = await Absence.find(filtre)
      .populate(POPULATE)
      .sort({ date: -1 });

    res.status(200).json(absences);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMesAbsences = async (req, res) => {
  try {
    const absences = await Absence.find({
      etudiant: req.user.id,
    })
      .populate({
        path: "seance",
        populate: { path: "cours", select: "titre" },
      })
      .sort({ date: -1 });

    const justifiees = absences.filter((a) => a.justifiee).length;

    res.status(200).json({
      justifiees,
      non_justifiees: absences.length - justifiees,
      absences,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getAbsenceById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const absence = await Absence.findById(req.params.id).populate(POPULATE);

    if (!absence) {
      return res.status(404).json({
        message: "Absence introuvable",
      });
    }

    res.status(200).json(absence);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateAbsence = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const modifications = {};

    if (req.body.justifiee !== undefined) {
      modifications.justifiee = req.body.justifiee === true;
    }

    if (req.body.motif !== undefined) {
      modifications.motif = req.body.motif;
    }

    const absence = await Absence.findByIdAndUpdate(
      req.params.id,
      modifications,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!absence) {
      return res.status(404).json({
        message: "Absence introuvable",
      });
    }

    res.status(200).json(absence);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteAbsence = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const absence = await Absence.findByIdAndDelete(req.params.id);

    if (!absence) {
      return res.status(404).json({
        message: "Absence introuvable",
      });
    }

    res.status(200).json({
      message: "Absence supprimée",
    });
  } catch (error) {
    gererErreur(error, res);
  }
};
