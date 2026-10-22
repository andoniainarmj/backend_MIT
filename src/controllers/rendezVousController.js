const mongoose = require("mongoose");
const RendezVous = require("../models/RendezVous");
const { gererErreur } = require("../utils/erreurs");
const { emailValide, MESSAGE_EMAIL } = require("../utils/validation");
const { envoyerEmail } = require("../utils/mailer");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));

// Madagascar : UTC+3, sans changement d'heure
const DECALAGE_MS = 3 * 60 * 60 * 1000;
const OUVERTURE_MIN = 8 * 60;
const FERMETURE_MIN = 17 * 60 + 30;
const DUREE_MIN = 15;
const DUREE_MS = DUREE_MIN * 60 * 1000;
const HORIZON_JOURS = 90;
const MAX_DEMANDES_PAR_HEURE = 3;
const STATUTS_ACTIFS = ["en_attente", "confirme"];

const versLocal = (date) => new Date(date.getTime() + DECALAGE_MS);

const formaterDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Indian/Antananarivo",
  }).format(date);

const creneauValide = (debut) => {
  const local = versLocal(debut);
  const jour = local.getUTCDay();
  if (jour === 0 || jour === 6) return false;
  if (local.getUTCSeconds() !== 0 || local.getUTCMilliseconds() !== 0) {
    return false;
  }
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return (
    minutes >= OUVERTURE_MIN &&
    minutes + DUREE_MIN <= FERMETURE_MIN &&
    minutes % DUREE_MIN === 0
  );
};

exports.getCreneaux = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ message: "Date obligatoire au format AAAA-MM-JJ" });
    }

    const minuit = new Date(`${date}T00:00:00+03:00`);
    if (isNaN(minuit)) {
      return res.status(400).json({ message: "Date invalide" });
    }

    const jour = versLocal(minuit).getUTCDay();
    if (jour === 0 || jour === 6) {
      return res.status(200).json({ date, creneaux: [] });
    }

    const pris = await RendezVous.find({
      debut: {
        $gte: minuit,
        $lt: new Date(minuit.getTime() + 24 * 60 * 60 * 1000),
      },
      statut: { $in: STATUTS_ACTIFS },
    }).select("debut");
    const occupes = new Set(pris.map((r) => r.debut.getTime()));

    const maintenant = Date.now();
    const creneaux = [];
    for (
      let m = OUVERTURE_MIN;
      m + DUREE_MIN <= FERMETURE_MIN;
      m += DUREE_MIN
    ) {
      const debut = new Date(minuit.getTime() + m * 60 * 1000);
      creneaux.push({
        debut,
        fin: new Date(debut.getTime() + DUREE_MS),
        disponible:
          debut.getTime() > maintenant && !occupes.has(debut.getTime()),
      });
    }

    res.status(200).json({ date, creneaux });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.createRendezVous = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, motif } = req.body;

    if (!nom || !email || !motif || !req.body.debut) {
      return res.status(400).json({
        message: "Nom, email, motif et créneau sont obligatoires",
      });
    }
    if (!emailValide(email)) {
      return res.status(400).json({ message: MESSAGE_EMAIL });
    }

    const debut = new Date(req.body.debut);
    if (isNaN(debut)) {
      return res.status(400).json({ message: "Date invalide" });
    }
    if (debut.getTime() <= Date.now()) {
      return res
        .status(400)
        .json({ message: "Le créneau doit être dans le futur" });
    }
    if (debut.getTime() > Date.now() + HORIZON_JOURS * 24 * 60 * 60 * 1000) {
      return res.status(400).json({
        message: `Le rendez-vous doit être pris dans les ${HORIZON_JOURS} jours`,
      });
    }
    if (!creneauValide(debut)) {
      return res.status(400).json({
        message:
          "Créneau invalide (lundi au vendredi, 08h00-17h30, par tranches de 15 minutes)",
      });
    }

    // Anti-spam : limite par adresse e-mail
    const recentes = await RendezVous.countDocuments({
      email: String(email).toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recentes >= MAX_DEMANDES_PAR_HEURE) {
      return res.status(429).json({
        message: "Trop de demandes envoyées, réessayez plus tard",
      });
    }

    if (await RendezVous.findOne({ debut, statut: { $in: STATUTS_ACTIFS } })) {
      return res
        .status(409)
        .json({ message: "Ce créneau n'est plus disponible" });
    }

    const fin = new Date(debut.getTime() + DUREE_MS);
    const rdv = await RendezVous.create({
      nom,
      prenom,
      email,
      telephone,
      motif,
      debut,
      fin,
    });

    res.status(201).json({
      message: "Demande de rendez-vous envoyée avec succès",
      id: rdv._id,
      debut: rdv.debut,
      fin: rdv.fin,
    });

    // E-mails envoyés après la réponse : un échec n'empêche jamais l'enregistrement
    const demandeur = [prenom, nom].filter(Boolean).join(" ");

    if (process.env.MAIL_CONTACT) {
      await envoyerEmail({
        to: process.env.MAIL_CONTACT,
        subject: `[Rendez-vous MIT] ${demandeur} - ${formaterDate(debut)}`,
        text: [
          `Demande de rendez-vous de ${demandeur} <${rdv.email}>`,
          telephone ? `Téléphone : ${telephone}` : null,
          `Créneau : ${formaterDate(debut)}`,
          "",
          `Motif : ${motif}`,
        ]
          .filter((l) => l !== null)
          .join("\n"),
        replyTo: rdv.email,
      });
    }

    await envoyerEmail({
      to: rdv.email,
      subject: "Votre demande de rendez-vous a bien été reçue",
      text:
        `Bonjour ${demandeur},\n\n` +
        `Nous avons bien reçu votre demande de rendez-vous du ${formaterDate(debut)} (15 minutes, en visioconférence).\n\n` +
        "Vous recevrez un e-mail de confirmation avec le lien de la visioconférence dès que votre demande aura été validée.\n\n" +
        "L'équipe MIT-Madagascar",
    });
  } catch (error) {
    if (!res.headersSent) gererErreur(error, res);
    else console.error(error);
  }
};

exports.getRendezVous = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;
    if (req.query.du || req.query.au) {
      filtre.debut = {};
      if (req.query.du) filtre.debut.$gte = new Date(req.query.du);
      if (req.query.au) filtre.debut.$lte = new Date(req.query.au);
    }

    const liste = await RendezVous.find(filtre)
      .populate("traite_par", "nom prenom")
      .sort({ debut: 1 });
    res.status(200).json(liste);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getRendezVousById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const rdv = await RendezVous.findById(req.params.id).populate(
      "traite_par",
      "nom prenom",
    );
    if (!rdv) {
      return res.status(404).json({ message: "Rendez-vous introuvable" });
    }
    res.status(200).json(rdv);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.confirmerRendezVous = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const rdv = await RendezVous.findById(req.params.id);
    if (!rdv) {
      return res.status(404).json({ message: "Rendez-vous introuvable" });
    }
    if (rdv.statut !== "en_attente") {
      return res.status(400).json({
        message: "Seule une demande en attente peut être confirmée",
      });
    }

    const lien = (req.body.lien_visio || "").trim();
    if (lien && !/^https?:\/\//i.test(lien)) {
      return res.status(400).json({
        message:
          "Le lien de visioconférence doit commencer par http:// ou https://",
      });
    }

    rdv.statut = "confirme";
    if (lien) rdv.lien_visio = lien;
    rdv.traite_par = req.user.id;
    await rdv.save();

    const demandeur = rdv.prenom || rdv.nom;
    const resultat = await envoyerEmail({
      to: rdv.email,
      subject: "Votre rendez-vous est confirmé",
      text:
        `Bonjour ${demandeur},\n\n` +
        `Votre rendez-vous avec un conseiller d'orientation est confirmé pour le ${formaterDate(rdv.debut)} (15 minutes, en visioconférence).\n\n` +
        (rdv.lien_visio
          ? `Lien de la visioconférence : ${rdv.lien_visio}\n\n`
          : "Le lien de la visioconférence vous sera communiqué avant le rendez-vous.\n\n") +
        "À bientôt,\nL'équipe MIT-Madagascar",
      replyTo: process.env.MAIL_CONTACT,
    });

    res.status(200).json({ rendez_vous: rdv, email_envoye: resultat.envoye });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.refuserRendezVous = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const rdv = await RendezVous.findById(req.params.id);
    if (!rdv) {
      return res.status(404).json({ message: "Rendez-vous introuvable" });
    }
    if (!STATUTS_ACTIFS.includes(rdv.statut)) {
      return res.status(400).json({
        message: "Ce rendez-vous est déjà refusé ou annulé",
      });
    }

    const etaitConfirme = rdv.statut === "confirme";
    rdv.statut = etaitConfirme ? "annule" : "refuse";
    const raison = (req.body.raison || "").trim();
    if (raison) rdv.raison = raison;
    rdv.traite_par = req.user.id;
    await rdv.save();

    const demandeur = rdv.prenom || rdv.nom;
    const resultat = await envoyerEmail({
      to: rdv.email,
      subject: etaitConfirme
        ? "Votre rendez-vous est annulé"
        : "Votre demande de rendez-vous",
      text:
        `Bonjour ${demandeur},\n\n` +
        (etaitConfirme
          ? `Nous sommes désolés, votre rendez-vous du ${formaterDate(rdv.debut)} est annulé.\n\n`
          : `Nous ne pouvons malheureusement pas donner suite à votre demande de rendez-vous du ${formaterDate(rdv.debut)}.\n\n`) +
        (raison ? `${raison}\n\n` : "") +
        "Vous pouvez choisir un autre créneau sur notre site.\n\n" +
        "L'équipe MIT-Madagascar",
      replyTo: process.env.MAIL_CONTACT,
    });

    res.status(200).json({ rendez_vous: rdv, email_envoye: resultat.envoye });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteRendezVous = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const rdv = await RendezVous.findByIdAndDelete(req.params.id);
    if (!rdv) {
      return res.status(404).json({ message: "Rendez-vous introuvable" });
    }
    res.status(200).json({ message: "Rendez-vous supprimé" });
  } catch (error) {
    gererErreur(error, res);
  }
};
