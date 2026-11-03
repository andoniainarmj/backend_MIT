const mongoose = require("mongoose");
const User = require("../models/User");
const Cours = require("../models/Cours");
const Note = require("../models/Note");
const Absence = require("../models/Absence");
const Inscription = require("../models/Inscription");
const Candidature = require("../models/Candidature");
const Convention = require("../models/Convention");
const Paiement = require("../models/Paiement");
const Document = require("../models/Document");
const { gererErreur } = require("../utils/erreurs");
const {
  calculerMoyenne,
  statutMatiere,
  calculerResume,
} = require("../utils/calculNotes");

exports.getDossierEtudiant = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const etudiant = await User.findById(req.params.id)
      .select("-mot_de_passe")
      .populate("formation", "titre");
    if (!etudiant) {
      return res.status(404).json({ message: "Étudiant introuvable" });
    }
    if (etudiant.role !== "etudiant") {
      return res
        .status(400)
        .json({ message: "Cet utilisateur n'est pas un étudiant" });
    }

    // Cours de sa formation et de son niveau
    let cours = [];
    if (etudiant.formation) {
      const filtreCours = { formation: etudiant.formation._id };
      if (etudiant.niveau) filtreCours.niveau = etudiant.niveau;
      cours = await Cours.find(filtreCours)
        .populate("enseignant", "nom prenom")
        .sort({ semestre: 1, titre: 1 });
    }
    const coursIds = cours.map((c) => c._id);

    const [
      notes,
      absences,
      inscriptions,
      candidatures,
      conventions,
      paiements,
      documents,
    ] = await Promise.all([
      Note.find({ etudiant: etudiant._id, cours: { $in: coursIds } }),
      Absence.find({ etudiant: etudiant._id })
        .populate({
          path: "seance",
          populate: { path: "cours", select: "titre" },
        })
        .sort({ date: -1 }),
      Inscription.find({ utilisateur: etudiant._id })
        .populate("formation", "titre")
        .sort({ date_inscription: -1 }),
      Candidature.find({ utilisateur: etudiant._id })
        .populate({
          path: "offre",
          select: "titre statut",
          populate: { path: "entreprise", select: "nom" },
        })
        .sort({ date_candidature: -1 }),
      Convention.find({ etudiant: etudiant._id })
        .populate("entreprise", "nom")
        .populate("tuteur", "nom prenom")
        .sort({ date_debut: -1 }),
      Paiement.find({ etudiant: etudiant._id }).sort({ echeance: 1 }),
      Document.find({ proprietaire: etudiant._id }).sort({ date_ajout: -1 }),
    ]);

    // Notes par matière
    const parCours = {};
    notes.forEach((n) => {
      parCours[String(n.cours)] = n;
    });
    const lignes = cours.map((c) => {
      const n = parCours[String(c._id)];
      const moyenne = n ? calculerMoyenne(n) : null;
      return {
        note_id: n ? n._id : null,
        cours: {
          id: c._id,
          titre: c.titre,
          semestre: c.semestre,
          enseignant: c.enseignant,
        },
        cc1: n ? n.cc1 : null,
        cc2: n ? n.cc2 : null,
        examen: n ? n.examen : null,
        moyenne,
        coefficient: c.coefficient,
        ects: c.ects,
        validee: n ? n.validee : false,
        statut: statutMatiere(moyenne),
      };
    });
    const resume = calculerResume(lignes);
    resume.ects_total = cours.reduce((somme, c) => somme + c.ects, 0);

    // Rang dans la promotion
    let rang = null;
    let effectifPromotion = null;
    if (etudiant.formation && etudiant.niveau) {
      const camarades = await User.find({
        role: "etudiant",
        statut: "actif",
        formation: etudiant.formation._id,
        niveau: etudiant.niveau,
      }).select("_id");
      const notesPromo = await Note.find({
        etudiant: { $in: camarades.map((c) => c._id) },
        cours: { $in: coursIds },
      });
      const infosCours = {};
      cours.forEach((c) => {
        infosCours[String(c._id)] = c;
      });
      const parEtudiant = {};
      notesPromo.forEach((n) => {
        const c = infosCours[String(n.cours)];
        (parEtudiant[String(n.etudiant)] ||= []).push({
          moyenne: calculerMoyenne(n),
          coefficient: c.coefficient,
          ects: c.ects,
        });
      });
      const classement = Object.entries(parEtudiant)
        .map(([id, l]) => ({ id, moyenne: calculerResume(l).moyenne_generale }))
        .filter((e) => e.moyenne !== null)
        .sort((a, b) => b.moyenne - a.moyenne);
      const position = classement.findIndex(
        (e) => e.id === String(etudiant._id),
      );
      rang = position >= 0 ? position + 1 : null;
      effectifPromotion = classement.length;
    }

    // Absences
    const justifiees = absences.filter((a) => a.justifiee).length;

    // Paiements
    const maintenant = new Date();
    const listePaiements = paiements.map((p) => ({
      ...p.toObject(),
      statut_effectif:
        p.statut === "en_attente" && p.echeance < maintenant
          ? "en_retard"
          : p.statut,
    }));
    const somme = (statuts) =>
      listePaiements
        .filter((p) => statuts.includes(p.statut_effectif))
        .reduce((total, p) => total + p.montant, 0);

    res.status(200).json({
      profil: {
        id: etudiant._id,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        email: etudiant.email,
        telephone: etudiant.telephone,
        adresse: etudiant.adresse,
        date_naissance: etudiant.date_naissance,
        photo: etudiant.photo,
        numero_etudiant: etudiant.numero_etudiant,
        formation: etudiant.formation,
        niveau: etudiant.niveau,
        statut: etudiant.statut,
        date_inscription: etudiant.date_inscription,
      },
      notes: {
        ...resume,
        rang,
        effectif_promotion: effectifPromotion,
        matieres: lignes,
      },
      absences: {
        total: absences.length,
        justifiees,
        non_justifiees: absences.length - justifiees,
        liste: absences,
      },
      inscriptions,
      candidatures,
      conventions,
      paiements: {
        total_paye: somme(["paye"]),
        total_restant: somme(["en_attente", "en_retard"]),
        liste: listePaiements,
      },
      documents,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};
