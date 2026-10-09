const User = require("../models/User");
const Cours = require("../models/Cours");
const Seance = require("../models/Seance");
const Note = require("../models/Note");
const Absence = require("../models/Absence");
const Convention = require("../models/Convention");
const Paiement = require("../models/Paiement");
const Document = require("../models/Document");
const Formation = require("../models/Formation");
const Candidature = require("../models/Candidature");
const MessageContact = require("../models/MessageContact");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { gererErreur } = require("../utils/erreurs");
const {
  arrondir,
  calculerMoyenne,
  calculerResume,
} = require("../utils/calculNotes");

const debutSemaine = () => {
  const d = new Date();
  const jour = (d.getDay() + 6) % 7; // lundi = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - jour);
  return d;
};

exports.getDashboardEtudiant = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "formation",
      "titre",
    );
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const maintenant = new Date();
    const debut = debutSemaine();
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 7);

    const formationId = user.formation ? user.formation._id : null;
    const coursFormation = formationId
      ? await Cours.find({ formation: formationId })
      : [];
    const infosCours = {};
    coursFormation.forEach((c) => {
      infosCours[String(c._id)] = c;
    });

    // Notes validées et moyennes
    const notes = await Note.find({
      etudiant: user._id,
      validee: true,
      cours: { $in: coursFormation.map((c) => c._id) },
    }).sort({ updatedAt: -1 });

    const lignes = notes.map((n) => {
      const c = infosCours[String(n.cours)];
      return {
        note: n,
        cours: c,
        moyenne: calculerMoyenne(n),
        coefficient: c.coefficient,
        ects: c.ects,
        semestre: c.semestre,
      };
    });
    const resume = calculerResume(lignes);

    // Évolution par rapport au semestre précédent
    const parSemestre = {};
    lignes.forEach((l) => {
      if (l.moyenne !== null) (parSemestre[l.semestre] ||= []).push(l);
    });
    const moyennesSemestre = Object.keys(parSemestre)
      .sort()
      .map((s) => ({
        semestre: s,
        moyenne: calculerResume(parSemestre[s]).moyenne_generale,
      }));
    const n = moyennesSemestre.length;
    const evolution =
      n >= 2
        ? arrondir(
            moyennesSemestre[n - 1].moyenne - moyennesSemestre[n - 2].moyenne,
          )
        : null;

    const notesRecentes = lignes
      .filter((l) => l.moyenne !== null)
      .slice(0, 3)
      .map((l) => ({
        cours: l.cours.titre,
        moyenne: l.moyenne,
        date: l.note.updatedAt,
      }));

    // Absences
    const absences = await Absence.find({ etudiant: user._id });
    const justifiees = absences.filter((a) => a.justifiee).length;

    // Emploi du temps
    let prochainCours = null;
    let semaine = [];
    if (formationId && user.niveau) {
      const filtre = {
        publiee: true,
        formation: formationId,
        niveau: user.niveau,
      };
      const populate = [
        { path: "cours", select: "titre" },
        { path: "enseignant", select: "nom prenom" },
        { path: "salle", select: "nom" },
      ];
      prochainCours = await Seance.findOne({
        ...filtre,
        debut: { $gte: maintenant },
      })
        .sort({ debut: 1 })
        .populate(populate);
      semaine = await Seance.find({
        ...filtre,
        debut: { $gte: debut, $lt: fin },
      })
        .sort({ debut: 1 })
        .populate(populate);
    }

    // Documents de la formation
    const documents = formationId
      ? await Document.find({ formation: formationId })
          .sort({ date_ajout: -1 })
          .limit(3)
          .select("titre type fichier date_ajout")
      : [];

    // Alternance et finances
    const convention = await Convention.findOne({
      etudiant: user._id,
      statut: "active",
    }).populate("entreprise", "nom");

    const paiementsEnAttente = await Paiement.find({
      etudiant: user._id,
      statut: "en_attente",
    });

    // Messages non lus
    const conversations = await Conversation.find({
      participants: user._id,
    }).select("_id");
    const messagesNonLus = await Message.countDocuments({
      conversation: { $in: conversations.map((c) => c._id) },
      auteur: { $ne: user._id },
      lu_par: { $ne: user._id },
    });

    res.status(200).json({
      etudiant: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        numero_etudiant: user.numero_etudiant,
        formation: user.formation,
        niveau: user.niveau,
      },
      moyenne_generale: resume.moyenne_generale,
      mention: resume.mention,
      evolution_semestre: evolution,
      ects_valides: resume.ects_valides,
      ects_total: coursFormation.reduce((somme, c) => somme + c.ects, 0),
      absences: {
        justifiees,
        non_justifiees: absences.length - justifiees,
      },
      prochain_cours: prochainCours,
      emploi_du_temps_semaine: semaine,
      notes_recentes: notesRecentes,
      documents_recents: documents,
      alternance: convention,
      paiements_restants: {
        nombre: paiementsEnAttente.length,
        montant: paiementsEnAttente.reduce((s, p) => s + p.montant, 0),
      },
      messages_non_lus: messagesNonLus,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getDashboardAdmin = async (req, res) => {
  try {
    const maintenant = new Date();
    const debutAnnee = new Date(maintenant.getFullYear(), 0, 1);
    const il30j = new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      etudiantsActifs,
      inscritsCetteAnnee,
      nouveaux30j,
      enseignants,
      formations,
      etudiantsPlaces,
      notesValidees,
      derniersEtudiants,
      absencesNonJustifiees,
      conventionsEnValidation,
      candidaturesEnAttente,
      messagesContactNonLus,
    ] = await Promise.all([
      User.countDocuments({ role: "etudiant", statut: "actif" }),
      User.countDocuments({
        role: "etudiant",
        createdAt: { $gte: debutAnnee },
      }),
      User.countDocuments({ role: "etudiant", createdAt: { $gte: il30j } }),
      User.countDocuments({ role: "enseignant", statut: "actif" }),
      Formation.countDocuments(),
      Convention.distinct("etudiant", { statut: "active" }),
      Note.find({ validee: true }).lean(),
      User.find({ role: "etudiant" })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("formation", "titre")
        .select("nom prenom niveau formation"),
      Absence.aggregate([
        { $match: { justifiee: false } },
        { $group: { _id: "$etudiant", total: { $sum: 1 } } },
        { $match: { total: { $gte: 3 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      Convention.find({ statut: "validation" })
        .populate("etudiant", "nom prenom niveau")
        .populate("entreprise", "nom")
        .limit(10),
      Candidature.countDocuments({ statut: "en_attente" }),
      MessageContact.countDocuments({ statut: "non_lu" }),
    ]);

    // Taux de réussite : part des moyennes >= 10
    const moyennes = notesValidees
      .map(calculerMoyenne)
      .filter((m) => m !== null);
    const tauxReussite = moyennes.length
      ? Math.round(
          (moyennes.filter((m) => m >= 10).length / moyennes.length) * 1000,
        ) / 10
      : null;

    // Variation sur 30 jours
    const avant = etudiantsActifs - nouveaux30j;
    const variation30j =
      avant > 0 ? Math.round((nouveaux30j / avant) * 100) : null;

    // Dernières inscriptions avec statut d'alternance
    const conventionsActives = await Convention.find({
      etudiant: { $in: derniersEtudiants.map((e) => e._id) },
      statut: "active",
    }).populate("entreprise", "nom");
    const parEtudiant = {};
    conventionsActives.forEach((c) => {
      parEtudiant[String(c.etudiant)] = c;
    });

    const dernieresInscriptions = derniersEtudiants.map((e) => {
      const c = parEtudiant[String(e._id)];
      return {
        id: e._id,
        nom: e.nom,
        prenom: e.prenom,
        niveau: e.niveau,
        formation: e.formation,
        alternance: c ? `Placé (${c.entreprise.nom})` : "En recherche",
      };
    });

    // Alertes
    const etudiantsAlertes = await User.find({
      _id: { $in: absencesNonJustifiees.map((a) => a._id) },
    }).select("nom prenom niveau");
    const alertes = [];
    absencesNonJustifiees.forEach((a) => {
      const e = etudiantsAlertes.find((x) => String(x._id) === String(a._id));
      if (e) {
        alertes.push({
          type: "absences",
          message: `${a.total} absences non justifiées`,
          etudiant: e,
        });
      }
    });
    conventionsEnValidation.forEach((c) => {
      alertes.push({
        type: "convention_en_validation",
        message: "Convention d'alternance en attente de validation",
        etudiant: c.etudiant,
        entreprise: c.entreprise,
      });
    });

    res.status(200).json({
      etudiants_actifs: etudiantsActifs,
      inscrits_cette_annee: inscritsCetteAnnee,
      variation_etudiants_30j_pct: variation30j,
      enseignants,
      formations,
      taux_reussite: tauxReussite,
      alternance: {
        places: etudiantsPlaces.length,
        taux_placement: etudiantsActifs
          ? Math.round((etudiantsPlaces.length / etudiantsActifs) * 100)
          : 0,
      },
      candidatures_en_attente: candidaturesEnAttente,
      messages_contact_non_lus: messagesContactNonLus,
      dernieres_inscriptions: dernieresInscriptions,
      alertes,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};
