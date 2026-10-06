const mongoose = require("mongoose");
const Seance = require("../models/Seance");
const Cours = require("../models/Cours");
const Salle = require("../models/Salle");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));

const POPULATE = [
  { path: "cours", select: "titre code" },
  { path: "enseignant", select: "nom prenom" },
  { path: "salle", select: "nom" },
  { path: "formation", select: "titre" },
];

const trouverConflits = async (donnees, ignorerId) => {
  const filtre = {
    debut: { $lt: donnees.fin },
    fin: { $gt: donnees.debut },
    $or: [
      { salle: donnees.salle },
      { enseignant: donnees.enseignant },
      { formation: donnees.formation, niveau: donnees.niveau },
    ],
  };
  if (ignorerId) filtre._id = { $ne: ignorerId };

  const existantes = await Seance.find(filtre);
  const conflits = [];
  existantes.forEach((s) => {
    if (String(s.salle) === String(donnees.salle)) {
      conflits.push("Salle déjà occupée sur ce créneau");
    }
    if (String(s.enseignant) === String(donnees.enseignant)) {
      conflits.push("Enseignant déjà occupé sur ce créneau");
    }
    if (
      String(s.formation) === String(donnees.formation) &&
      s.niveau === donnees.niveau
    ) {
      conflits.push("Cette promotion a déjà une séance sur ce créneau");
    }
  });
  return [...new Set(conflits)];
};

const preparerDonnees = async (body, existante) => {
  const base = existante ? existante.toObject() : {};
  const fusion = { ...base, ...body };

  if (!fusion.cours || !idValide(fusion.cours)) {
    return { erreur: { status: 400, message: "Cours invalide" } };
  }
  const cours = await Cours.findById(fusion.cours);
  if (!cours) {
    return { erreur: { status: 404, message: "Cours introuvable" } };
  }

  const enseignantId = fusion.enseignant || cours.enseignant;
  if (!enseignantId || !idValide(enseignantId)) {
    return { erreur: { status: 400, message: "Enseignant obligatoire" } };
  }
  const enseignant = await User.findById(enseignantId);
  if (!enseignant || enseignant.role !== "enseignant") {
    return { erreur: { status: 404, message: "Enseignant introuvable" } };
  }

  if (!fusion.salle || !idValide(fusion.salle)) {
    return { erreur: { status: 400, message: "Salle invalide" } };
  }
  if (!(await Salle.findById(fusion.salle))) {
    return { erreur: { status: 404, message: "Salle introuvable" } };
  }

  const debut = new Date(fusion.debut);
  const fin = new Date(fusion.fin);
  if (isNaN(debut) || isNaN(fin)) {
    return { erreur: { status: 400, message: "Dates invalides" } };
  }
  if (debut >= fin) {
    return {
      erreur: { status: 400, message: "La fin doit être après le début" },
    };
  }

  return {
    donnees: {
      cours: cours._id,
      enseignant: enseignant._id,
      salle: fusion.salle,
      formation: cours.formation,
      niveau: cours.niveau,
      debut,
      fin,
      type: fusion.type,
      publiee: fusion.publiee === true,
    },
  };
};

exports.createSeance = async (req, res) => {
  try {
    const { erreur, donnees } = await preparerDonnees(req.body);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const conflits = await trouverConflits(donnees);
    if (conflits.length > 0) {
      return res.status(409).json({ message: "Conflit d'horaire", conflits });
    }

    const seance = await Seance.create(donnees);
    res.status(201).json(seance);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getSeances = async (req, res) => {
  try {
    const filtre = {};
    ["formation", "niveau", "enseignant", "salle", "cours"].forEach((champ) => {
      if (req.query[champ]) filtre[champ] = req.query[champ];
    });
    if (req.query.du) filtre.debut = { $gte: new Date(req.query.du) };
    if (req.query.au) filtre.fin = { $lte: new Date(req.query.au) };

    if (!["admin", "super_admin"].includes(req.user.role)) {
      filtre.publiee = true;
    }

    const seances = await Seance.find(filtre)
      .populate(POPULATE)
      .sort({ debut: 1 });
    res.status(200).json(seances);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMonPlanning = async (req, res) => {
  try {
    const filtre = { publiee: true };

    if (req.user.role === "enseignant") {
      filtre.enseignant = req.user.id;
    } else if (req.user.role === "etudiant") {
      const user = await User.findById(req.user.id);
      if (!user || !user.formation || !user.niveau) {
        return res.status(400).json({
          message: "Formation ou niveau non renseigné sur votre profil",
        });
      }
      filtre.formation = user.formation;
      filtre.niveau = user.niveau;
    } else {
      return res.status(403).json({ message: "Accès refusé" });
    }

    if (req.query.du) filtre.debut = { $gte: new Date(req.query.du) };
    if (req.query.au) filtre.fin = { $lte: new Date(req.query.au) };

    const seances = await Seance.find(filtre)
      .populate(POPULATE)
      .sort({ debut: 1 });
    res.status(200).json(seances);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getSeanceById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const seance = await Seance.findById(req.params.id).populate(POPULATE);
    if (!seance) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json(seance);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateSeance = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const existante = await Seance.findById(req.params.id);
    if (!existante) {
      return res.status(404).json({ message: "Séance introuvable" });
    }

    const { erreur, donnees } = await preparerDonnees(req.body, existante);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const conflits = await trouverConflits(donnees, existante._id);
    if (conflits.length > 0) {
      return res.status(409).json({ message: "Conflit d'horaire", conflits });
    }

    const seance = await Seance.findByIdAndUpdate(existante._id, donnees, {
      new: true,
      runValidators: true,
    });
    res.status(200).json(seance);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.publierSeances = async (req, res) => {
  try {
    const { formation, niveau, du, au } = req.body;
    const publiee = req.body.publiee !== false;

    if (!formation || !idValide(formation) || !niveau) {
      return res
        .status(400)
        .json({ message: "Formation et niveau sont obligatoires" });
    }

    const filtre = { formation, niveau };
    if (du) filtre.debut = { $gte: new Date(du) };
    if (au) filtre.fin = { $lte: new Date(au) };

    const resultat = await Seance.updateMany(filtre, { publiee });
    res.status(200).json({
      message: publiee ? "Emploi du temps publié" : "Emploi du temps dépublié",
      modifiees: resultat.modifiedCount,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteSeance = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const seance = await Seance.findByIdAndDelete(req.params.id);
    if (!seance) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json({ message: "Séance supprimée" });
  } catch (error) {
    gererErreur(error, res);
  }
};
