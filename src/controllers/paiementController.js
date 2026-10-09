const mongoose = require("mongoose");
const Paiement = require("../models/Paiement");
const Depense = require("../models/Depense");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));

const statutEffectif = (p) =>
  p.statut === "en_attente" && new Date(p.echeance) < new Date()
    ? "en_retard"
    : p.statut;

const formater = (p) => ({
  ...p.toObject(),
  statut_effectif: statutEffectif(p),
});

const POPULATE = { path: "etudiant", select: "nom prenom numero_etudiant" };

const total = (resultat) => (resultat.length ? resultat[0].total : 0);

exports.createPaiement = async (req, res) => {
  try {
    const { etudiant } = req.body;
    if (!etudiant || !idValide(etudiant)) {
      return res.status(400).json({ message: "Étudiant invalide" });
    }
    const user = await User.findById(etudiant);
    if (!user || user.role !== "etudiant") {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }

    const donnees = { ...req.body };
    if (donnees.statut === "paye" && !donnees.date_paiement) {
      donnees.date_paiement = new Date();
    }
    const paiement = await Paiement.create(donnees);
    res.status(201).json(formater(paiement));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getPaiements = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.etudiant) filtre.etudiant = req.query.etudiant;

    const maintenant = new Date();
    if (req.query.statut === "en_retard") {
      filtre.statut = "en_attente";
      filtre.echeance = { $lt: maintenant };
    } else if (req.query.statut === "en_attente") {
      filtre.statut = "en_attente";
      filtre.echeance = { $gte: maintenant };
    } else if (req.query.statut) {
      filtre.statut = req.query.statut;
    }

    const paiements = await Paiement.find(filtre)
      .populate(POPULATE)
      .sort({ echeance: 1 });
    res.status(200).json(paiements.map(formater));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMesPaiements = async (req, res) => {
  try {
    const paiements = await Paiement.find({ etudiant: req.user.id }).sort({
      echeance: 1,
    });
    const liste = paiements.map(formater);
    const somme = (statuts) =>
      liste
        .filter((p) => statuts.includes(p.statut_effectif))
        .reduce((s, p) => s + p.montant, 0);

    res.status(200).json({
      total_paye: somme(["paye"]),
      total_restant: somme(["en_attente", "en_retard"]),
      paiements: liste,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getStats = async (req, res) => {
  try {
    const maintenant = new Date();

    const recettes = total(
      await Paiement.aggregate([
        { $match: { statut: "paye" } },
        { $group: { _id: null, total: { $sum: "$montant" } } },
      ]),
    );
    const depenses = total(
      await Depense.aggregate([
        { $group: { _id: null, total: { $sum: "$montant" } } },
      ]),
    );
    const enAttente = await Paiement.aggregate([
      { $match: { statut: "en_attente" } },
      {
        $group: { _id: null, total: { $sum: "$montant" }, nombre: { $sum: 1 } },
      },
    ]);
    const enRetard = await Paiement.aggregate([
      { $match: { statut: "en_attente", echeance: { $lt: maintenant } } },
      {
        $group: { _id: null, total: { $sum: "$montant" }, nombre: { $sum: 1 } },
      },
    ]);
    const parDepartement = await Depense.aggregate([
      { $group: { _id: "$departement", total: { $sum: "$montant" } } },
      { $project: { _id: 0, departement: "$_id", total: 1 } },
      { $sort: { total: -1 } },
    ]);

    res.status(200).json({
      recettes_totales: recettes,
      depenses_operationnelles: depenses,
      solde_net: recettes - depenses,
      factures_en_attente: {
        nombre: enAttente.length ? enAttente[0].nombre : 0,
        montant: enAttente.length ? enAttente[0].total : 0,
      },
      factures_en_retard: {
        nombre: enRetard.length ? enRetard[0].nombre : 0,
        montant: enRetard.length ? enRetard[0].total : 0,
      },
      depenses_par_departement: parDepartement,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updatePaiement = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const modifications = {};
    ["description", "montant", "echeance", "statut"].forEach((champ) => {
      if (req.body[champ] !== undefined) modifications[champ] = req.body[champ];
    });
    if (modifications.statut === "paye")
      modifications.date_paiement = new Date();

    const paiement = await Paiement.findByIdAndUpdate(
      req.params.id,
      modifications,
      { new: true, runValidators: true },
    );
    if (!paiement) {
      return res.status(404).json({ message: "Paiement introuvable" });
    }
    res.status(200).json(formater(paiement));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.payerPaiement = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const paiement = await Paiement.findByIdAndUpdate(
      req.params.id,
      { statut: "paye", date_paiement: new Date() },
      { new: true },
    );
    if (!paiement) {
      return res.status(404).json({ message: "Paiement introuvable" });
    }
    res.status(200).json(formater(paiement));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deletePaiement = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const paiement = await Paiement.findByIdAndDelete(req.params.id);
    if (!paiement) {
      return res.status(404).json({ message: "Paiement introuvable" });
    }
    res.status(200).json({ message: "Paiement supprimé" });
  } catch (error) {
    gererErreur(error, res);
  }
};
