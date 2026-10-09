const mongoose = require("mongoose");
const Convention = require("../models/Convention");
const Entreprise = require("../models/Entreprise");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));

const POPULATE = [
  { path: "etudiant", select: "nom prenom numero_etudiant" },
  { path: "entreprise", select: "nom" },
  { path: "tuteur", select: "nom prenom" },
];

const verifierReferences = async (body) => {
  if (body.etudiant) {
    if (!idValide(body.etudiant)) {
      return { status: 400, message: "Étudiant invalide" };
    }
    const etudiant = await User.findById(body.etudiant);
    if (!etudiant || etudiant.role !== "etudiant") {
      return { status: 404, message: "Étudiant introuvable" };
    }
  }
  if (body.entreprise) {
    if (!idValide(body.entreprise)) {
      return { status: 400, message: "Entreprise invalide" };
    }
    if (!(await Entreprise.findById(body.entreprise))) {
      return { status: 404, message: "Entreprise introuvable" };
    }
  }
  if (body.tuteur) {
    if (!idValide(body.tuteur)) {
      return { status: 400, message: "Tuteur invalide" };
    }
    const tuteur = await User.findById(body.tuteur);
    if (!tuteur || tuteur.role !== "enseignant") {
      return { status: 404, message: "Tuteur introuvable" };
    }
  }
  return null;
};

const verifierDates = (debut, fin) => {
  const d = new Date(debut);
  const f = new Date(fin);
  if (isNaN(d) || isNaN(f)) return "Dates invalides";
  if (d >= f) return "La date de fin doit être après la date de début";
  return null;
};

exports.createConvention = async (req, res) => {
  try {
    const { etudiant, entreprise, poste, date_debut, date_fin } = req.body;
    if (!etudiant || !entreprise || !poste || !date_debut || !date_fin) {
      return res.status(400).json({
        message: "Étudiant, entreprise, poste et dates sont obligatoires",
      });
    }

    const erreur = await verifierReferences(req.body);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const erreurDates = verifierDates(date_debut, date_fin);
    if (erreurDates) return res.status(400).json({ message: erreurDates });

    const convention = await Convention.create(req.body);
    res.status(201).json(convention);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getConventions = async (req, res) => {
  try {
    const filtre = {};
    ["etudiant", "entreprise", "statut", "tuteur"].forEach((champ) => {
      if (req.query[champ]) filtre[champ] = req.query[champ];
    });

    const conventions = await Convention.find(filtre)
      .populate(POPULATE)
      .sort({ date_debut: -1 });
    res.status(200).json(conventions);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMesConventions = async (req, res) => {
  try {
    const filtre =
      req.user.role === "enseignant"
        ? { tuteur: req.user.id }
        : { etudiant: req.user.id };

    const conventions = await Convention.find(filtre)
      .populate(POPULATE)
      .sort({ date_debut: -1 });
    res.status(200).json(conventions);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getStats = async (req, res) => {
  try {
    const actives = await Convention.distinct("etudiant", { statut: "active" });
    const signees = await Convention.countDocuments({
      statut: { $in: ["active", "terminee"] },
    });
    const enValidation = await Convention.countDocuments({
      statut: "validation",
    });
    const enRecherche = await User.countDocuments({
      role: "etudiant",
      statut: "actif",
      _id: { $nin: actives },
    });

    const parEntreprise = await Convention.aggregate([
      { $match: { statut: "active" } },
      { $group: { _id: "$entreprise", alternants: { $sum: 1 } } },
      {
        $lookup: {
          from: "entreprises",
          localField: "_id",
          foreignField: "_id",
          as: "entreprise",
        },
      },
      { $unwind: "$entreprise" },
      {
        $project: {
          _id: 0,
          entreprise: { _id: "$entreprise._id", nom: "$entreprise.nom" },
          alternants: 1,
        },
      },
      { $sort: { alternants: -1 } },
    ]);

    res.status(200).json({
      alternants_places: actives.length,
      en_recherche_active: enRecherche,
      conventions_signees: signees,
      conventions_en_validation: enValidation,
      entreprises_partenaires: parEntreprise,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getConventionById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const convention = await Convention.findById(req.params.id).populate(
      POPULATE,
    );
    if (!convention) {
      return res.status(404).json({ message: "Convention introuvable" });
    }
    res.status(200).json(convention);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateConvention = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const existante = await Convention.findById(req.params.id);
    if (!existante) {
      return res.status(404).json({ message: "Convention introuvable" });
    }

    const erreur = await verifierReferences(req.body);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const erreurDates = verifierDates(
      req.body.date_debut || existante.date_debut,
      req.body.date_fin || existante.date_fin,
    );
    if (erreurDates) return res.status(400).json({ message: erreurDates });

    const convention = await Convention.findByIdAndUpdate(
      existante._id,
      req.body,
      { new: true, runValidators: true },
    );
    res.status(200).json(convention);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteConvention = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const convention = await Convention.findByIdAndDelete(req.params.id);
    if (!convention) {
      return res.status(404).json({ message: "Convention introuvable" });
    }
    res.status(200).json({ message: "Convention supprimée" });
  } catch (error) {
    gererErreur(error, res);
  }
};
