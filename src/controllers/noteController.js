const mongoose = require("mongoose");
const Note = require("../models/Note");
const Cours = require("../models/Cours");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");
const {
  arrondir,
  calculerMoyenne,
  statutMatiere,
  calculerResume,
  distribution,
} = require("../utils/calculNotes");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));
const estAdmin = (user) => ["admin", "super_admin"].includes(user.role);

const verifierAccesCours = async (coursId, user) => {
  if (!coursId || !idValide(coursId)) {
    return { erreur: { status: 400, message: "Cours invalide" } };
  }
  const cours = await Cours.findById(coursId);
  if (!cours) {
    return { erreur: { status: 404, message: "Cours introuvable" } };
  }
  if (
    user.role === "enseignant" &&
    String(cours.enseignant) !== String(user.id)
  ) {
    return {
      erreur: { status: 403, message: "Ce cours ne vous est pas attribué" },
    };
  }
  return { cours };
};

// undefined = non fourni, null = vidé, nombre = valeur
const lireNote = (valeur) => {
  if (valeur === undefined) return { ignore: true };
  if (valeur === null || valeur === "") return { valeur: null };
  const n = Number(valeur);
  if (Number.isNaN(n) || n < 0 || n > 20) return { invalide: true };
  return { valeur: n };
};

exports.saisirNotes = async (req, res) => {
  try {
    const { cours: coursId, notes } = req.body;
    const { erreur, cours } = await verifierAccesCours(coursId, req.user);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    if (!Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({ message: "Liste de notes obligatoire" });
    }

    const enregistrees = [];
    for (const ligne of notes) {
      if (!ligne.etudiant || !idValide(ligne.etudiant)) {
        return res.status(400).json({ message: "Étudiant invalide" });
      }
      const etudiant = await User.findById(ligne.etudiant);
      if (!etudiant || etudiant.role !== "etudiant") {
        return res.status(404).json({ message: "Étudiant introuvable" });
      }

      const champs = {};
      for (const champ of ["cc1", "cc2", "examen"]) {
        const lue = lireNote(ligne[champ]);
        if (lue.invalide) {
          return res
            .status(400)
            .json({ message: `${champ} doit être compris entre 0 et 20` });
        }
        if (!lue.ignore) champs[champ] = lue.valeur;
      }

      const existante = await Note.findOne({
        etudiant: etudiant._id,
        cours: cours._id,
      });
      if (existante && existante.validee && !estAdmin(req.user)) {
        return res
          .status(403)
          .json({
            message: "Notes validées : modification réservée à l'admin",
          });
      }

      const note = await Note.findOneAndUpdate(
        { etudiant: etudiant._id, cours: cours._id },
        { $set: champs },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
      enregistrees.push(note);
    }

    res.status(200).json({
      message: "Notes enregistrées",
      notes: enregistrees.map((n) => ({
        ...n.toObject(),
        moyenne: calculerMoyenne(n),
      })),
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getNotesCours = async (req, res) => {
  try {
    const { erreur, cours } = await verifierAccesCours(
      req.params.coursId,
      req.user,
    );
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const etudiants = await User.find({
      role: "etudiant",
      statut: "actif",
      formation: cours.formation,
      niveau: cours.niveau,
    })
      .select("nom prenom numero_etudiant")
      .sort({ nom: 1 });

    const notes = await Note.find({ cours: cours._id });
    const parEtudiant = {};
    notes.forEach((n) => {
      parEtudiant[String(n.etudiant)] = n;
    });

    const lignes = etudiants.map((e) => {
      const n = parEtudiant[String(e._id)];
      return {
        etudiant: e,
        note_id: n ? n._id : null,
        cc1: n ? n.cc1 : null,
        cc2: n ? n.cc2 : null,
        examen: n ? n.examen : null,
        moyenne: n ? calculerMoyenne(n) : null,
        validee: n ? n.validee : false,
      };
    });

    const moyennes = lignes.map((l) => l.moyenne).filter((m) => m !== null);
    const statistiques = {
      effectif: lignes.length,
      notes_completes: moyennes.length,
      moyenne_classe: moyennes.length
        ? arrondir(moyennes.reduce((a, b) => a + b, 0) / moyennes.length)
        : null,
      taux_reussite: moyennes.length
        ? Math.round(
            (moyennes.filter((m) => m >= 10).length / moyennes.length) * 1000,
          ) / 10
        : null,
      distribution: distribution(moyennes),
    };

    res.status(200).json({ cours, statistiques, notes: lignes });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.validerNotes = async (req, res) => {
  try {
    const { cours: coursId } = req.body;
    const validee = req.body.validee !== false;

    if (!coursId || !idValide(coursId)) {
      return res.status(400).json({ message: "Cours invalide" });
    }
    if (!(await Cours.findById(coursId))) {
      return res.status(404).json({ message: "Cours introuvable" });
    }

    const resultat = await Note.updateMany({ cours: coursId }, { validee });
    res.status(200).json({
      message: validee ? "Notes validées" : "Validation annulée",
      modifiees: resultat.modifiedCount,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMesNotes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.formation || !user.niveau) {
      return res.status(400).json({
        message: "Formation ou niveau non renseigné sur votre profil",
      });
    }

    const filtreCours = { formation: user.formation, niveau: user.niveau };
    if (req.query.semestre) filtreCours.semestre = req.query.semestre;

    const cours = await Cours.find(filtreCours)
      .populate("enseignant", "nom prenom")
      .sort({ titre: 1 });
    const coursIds = cours.map((c) => c._id);

    const notes = await Note.find({
      etudiant: user._id,
      cours: { $in: coursIds },
      validee: true,
    });
    const parCours = {};
    notes.forEach((n) => {
      parCours[String(n.cours)] = n;
    });

    const lignes = cours.map((c) => {
      const n = parCours[String(c._id)];
      const moyenne = n ? calculerMoyenne(n) : null;
      return {
        cours: { id: c._id, titre: c.titre, enseignant: c.enseignant },
        cc1: n ? n.cc1 : null,
        cc2: n ? n.cc2 : null,
        examen: n ? n.examen : null,
        moyenne,
        coefficient: c.coefficient,
        ects: c.ects,
        statut: statutMatiere(moyenne),
      };
    });

    const resume = calculerResume(lignes);
    resume.ects_total = cours.reduce((somme, c) => somme + c.ects, 0);

    // Rang dans la promotion
    const camarades = await User.find({
      role: "etudiant",
      statut: "actif",
      formation: user.formation,
      niveau: user.niveau,
    }).select("_id");
    const notesPromo = await Note.find({
      etudiant: { $in: camarades.map((c) => c._id) },
      cours: { $in: coursIds },
      validee: true,
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
    const position = classement.findIndex((e) => e.id === String(user._id));

    res.status(200).json({
      ...resume,
      rang: position >= 0 ? position + 1 : null,
      effectif_promotion: classement.length,
      notes: lignes,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteNote = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const note = await Note.findByIdAndDelete(req.params.id);
    if (!note) {
      return res.status(404).json({ message: "Note introuvable" });
    }
    res.status(200).json({ message: "Note supprimée" });
  } catch (error) {
    gererErreur(error, res);
  }
};
