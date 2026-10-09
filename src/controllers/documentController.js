const mongoose = require("mongoose");
const Document = require("../models/Document");
const Formation = require("../models/Formation");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));
const estAdmin = (user) => ["admin", "super_admin"].includes(user.role);
const LIMITE_STOCKAGE = 5 * 1024 * 1024 * 1024;
const POPULATE = { path: "formation", select: "titre" };

exports.createDocument = async (req, res) => {
  try {
    const donnees = { ...req.body };

    if (!donnees.fichier) {
      return res.status(400).json({ message: "Fichier obligatoire" });
    }
    if (req.file) donnees.taille = req.file.size;

    if (estAdmin(req.user)) {
      if (donnees.formation) {
        if (!idValide(donnees.formation)) {
          return res.status(400).json({ message: "Formation invalide" });
        }
        if (!(await Formation.findById(donnees.formation))) {
          return res.status(404).json({ message: "Formation introuvable" });
        }
      }
      if (!donnees.visibilite) {
        donnees.visibilite = donnees.formation ? "formation" : "public";
      }
      if (donnees.visibilite === "formation" && !donnees.formation) {
        return res.status(400).json({
          message: "Formation obligatoire pour la visibilité « formation »",
        });
      }
      delete donnees.proprietaire;
    } else {
      donnees.visibilite = "prive";
      donnees.proprietaire = req.user.id;
      delete donnees.formation;
    }

    const document = await Document.create(donnees);
    res.status(201).json(document);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getDocumentsPublics = async (req, res) => {
  try {
    const filtre = { visibilite: "public" };
    if (req.query.categorie) filtre.categorie = req.query.categorie;

    const documents = await Document.find(filtre).sort({ date_ajout: -1 });
    res.status(200).json(documents);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMesDocuments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const conditions = [{ proprietaire: user._id }];
    if (user.formation) {
      conditions.push({ visibilite: "formation", formation: user.formation });
    }

    const filtre = { $or: conditions };
    if (req.query.categorie) filtre.categorie = req.query.categorie;

    const documents = await Document.find(filtre)
      .populate(POPULATE)
      .sort({ date_ajout: -1 });

    const utilise = await Document.aggregate([
      { $match: { proprietaire: user._id } },
      { $group: { _id: null, total: { $sum: "$taille" } } },
    ]);
    const parCategorie = await Document.aggregate([
      { $match: { $or: conditions } },
      { $group: { _id: "$categorie", nombre: { $sum: 1 } } },
      { $project: { _id: 0, categorie: "$_id", nombre: 1 } },
    ]);

    const octets = utilise.length ? utilise[0].total : 0;
    res.status(200).json({
      stockage: {
        utilise_octets: octets,
        limite_octets: LIMITE_STOCKAGE,
        pourcentage: Math.round((octets / LIMITE_STOCKAGE) * 100),
      },
      par_categorie: parCategorie,
      documents,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getTousDocuments = async (req, res) => {
  try {
    const filtre = {};
    ["formation", "visibilite", "categorie", "proprietaire"].forEach(
      (champ) => {
        if (req.query[champ]) filtre[champ] = req.query[champ];
      },
    );

    const documents = await Document.find(filtre)
      .populate(POPULATE)
      .populate("proprietaire", "nom prenom")
      .sort({ date_ajout: -1 });
    res.status(200).json(documents);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getDocumentById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const document = await Document.findById(req.params.id).populate(POPULATE);
    if (!document) {
      return res.status(404).json({ message: "Document introuvable" });
    }

    let autorise = document.visibilite === "public" || estAdmin(req.user);
    if (!autorise && String(document.proprietaire) === String(req.user.id)) {
      autorise = true;
    }
    if (!autorise && document.visibilite === "formation") {
      const user = await User.findById(req.user.id);
      autorise =
        user &&
        user.formation &&
        String(user.formation) === String(document.formation._id);
    }
    if (!autorise) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    res.status(200).json(document);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateDocument = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document introuvable" });
    }

    const admin = estAdmin(req.user);
    if (!admin && String(document.proprietaire) !== String(req.user.id)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const champs = admin
      ? ["titre", "type", "categorie", "fichier", "visibilite", "formation"]
      : ["titre", "type", "categorie", "fichier"];
    const modifications = {};
    champs.forEach((champ) => {
      if (req.body[champ] !== undefined) modifications[champ] = req.body[champ];
    });
    if (req.file) modifications.taille = req.file.size;

    if (admin && modifications.formation) {
      if (!idValide(modifications.formation)) {
        return res.status(400).json({ message: "Formation invalide" });
      }
      if (!(await Formation.findById(modifications.formation))) {
        return res.status(404).json({ message: "Formation introuvable" });
      }
    }

    const misAJour = await Document.findByIdAndUpdate(
      document._id,
      modifications,
      { new: true, runValidators: true },
    );
    res.status(200).json(misAJour);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document introuvable" });
    }

    if (
      !estAdmin(req.user) &&
      String(document.proprietaire) !== String(req.user.id)
    ) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    await document.deleteOne();
    res.status(200).json({ message: "Document supprimé" });
  } catch (error) {
    gererErreur(error, res);
  }
};
