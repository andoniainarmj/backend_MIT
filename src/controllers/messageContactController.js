const mongoose = require("mongoose");
const MessageContact = require("../models/MessageContact");
const { gererErreur } = require("../utils/erreurs");
const { emailValide, MESSAGE_EMAIL } = require("../utils/validation");
const { envoyerEmail } = require("../utils/mailer");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));
const POPULATE = [
  { path: "utilisateur", select: "nom prenom email" },
  { path: "repondu_par", select: "nom prenom" },
];
const MAX_MESSAGES_PAR_HEURE = 5;

exports.createMessage = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, entreprise, sujet, message } =
      req.body;

    if (!nom || !email || !sujet || !message) {
      return res.status(400).json({
        message: "Nom, email, objet et message sont obligatoires",
      });
    }
    if (!emailValide(email)) {
      return res.status(400).json({ message: MESSAGE_EMAIL });
    }

    // Anti-spam : limite par adresse e-mail
    const il_y_a_une_heure = new Date(Date.now() - 60 * 60 * 1000);
    const recents = await MessageContact.countDocuments({
      email: String(email).toLowerCase(),
      createdAt: { $gte: il_y_a_une_heure },
    });
    if (recents >= MAX_MESSAGES_PAR_HEURE) {
      return res.status(429).json({
        message: "Trop de messages envoyés, réessayez plus tard",
      });
    }

    const enregistre = await MessageContact.create({
      nom,
      prenom,
      email,
      telephone,
      entreprise,
      sujet,
      message,
    });

    res.status(201).json({
      message: "Message envoyé avec succès",
      id: enregistre._id,
    });

    // E-mails envoyés après la réponse : un échec n'empêche jamais l'enregistrement
    const expediteur = [prenom, nom].filter(Boolean).join(" ");
    const lignes = [
      `De : ${expediteur} <${enregistre.email}>`,
      telephone ? `Téléphone : ${telephone}` : null,
      entreprise ? `Entreprise : ${entreprise}` : null,
      "",
      message,
    ].filter((l) => l !== null);

    if (process.env.MAIL_CONTACT) {
      await envoyerEmail({
        to: process.env.MAIL_CONTACT,
        subject: `[Contact MIT] ${sujet}`,
        text: lignes.join("\n"),
        replyTo: enregistre.email,
      });
    }

    await envoyerEmail({
      to: enregistre.email,
      subject: "Nous avons bien reçu votre message",
      text:
        `Bonjour ${expediteur},\n\n` +
        "Nous avons bien reçu votre message et nous vous répondrons dans les meilleurs délais.\n\n" +
        `Objet : ${sujet}\n\n` +
        "L'équipe MIT-Madagascar",
    });
  } catch (error) {
    if (!res.headersSent) gererErreur(error, res);
    else console.error(error);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.statut) filtre.statut = req.query.statut;

    const messages = await MessageContact.find(filtre)
      .populate(POPULATE)
      .sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMessageById = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const message = await MessageContact.findById(req.params.id).populate(
      POPULATE,
    );
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }
    res.status(200).json(message);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateMessage = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const message = await MessageContact.findByIdAndUpdate(
      req.params.id,
      { statut: req.body.statut },
      { new: true, runValidators: true },
    );
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }
    res.status(200).json(message);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.repondreMessage = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const texte = (req.body.reponse || "").trim();
    if (!texte) {
      return res.status(400).json({ message: "Réponse obligatoire" });
    }

    const message = await MessageContact.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }

    const resultat = await envoyerEmail({
      to: message.email,
      subject: `Re: ${message.sujet}`,
      text:
        `Bonjour ${message.prenom || message.nom},\n\n` +
        `${texte}\n\n` +
        "L'équipe MIT-Madagascar\n\n" +
        "---\n" +
        `Votre message du ${message.createdAt.toLocaleDateString("fr-FR")} :\n` +
        message.message,
      replyTo: process.env.MAIL_CONTACT,
    });

    if (!resultat.envoye) {
      return res.status(503).json({
        message: `Réponse non envoyée : ${resultat.raison}`,
      });
    }

    message.reponse = texte;
    message.date_reponse = new Date();
    message.repondu_par = req.user.id;
    message.statut = "traite";
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const message = await MessageContact.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }
    res.status(200).json({ message: "Message supprimé" });
  } catch (error) {
    gererErreur(error, res);
  }
};
