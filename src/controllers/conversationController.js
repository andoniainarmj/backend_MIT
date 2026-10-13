const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));
const AUTEUR = "nom prenom role photo";

const chargerConversation = async (id, userId) => {
  if (!idValide(id)) {
    return { erreur: { status: 400, message: "Id invalide" } };
  }
  const conversation = await Conversation.findById(id);
  if (!conversation) {
    return { erreur: { status: 404, message: "Conversation introuvable" } };
  }
  const estParticipant = conversation.participants.some(
    (p) => String(p) === String(userId),
  );
  if (!estParticipant) {
    return { erreur: { status: 403, message: "Accès refusé" } };
  }
  return { conversation };
};

exports.getContacts = async (req, res) => {
  try {
    const filtre = { _id: { $ne: req.user.id }, statut: "actif" };
    if (req.query.role) filtre.role = req.query.role;
    if (req.query.q) {
      const motif = new RegExp(
        req.query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
      filtre.$or = [{ nom: motif }, { prenom: motif }];
    }

    const contacts = await User.find(filtre)
      .select(AUTEUR)
      .sort({ nom: 1 })
      .limit(50);
    res.status(200).json(contacts);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.creerConversation = async (req, res) => {
  try {
    const { nom } = req.body;
    const type = req.body.type || "direct";
    const demandes = Array.isArray(req.body.participants)
      ? req.body.participants
      : [];

    if (!["direct", "groupe"].includes(type)) {
      return res.status(400).json({ message: "Type invalide" });
    }
    if (demandes.some((id) => !idValide(id))) {
      return res.status(400).json({ message: "Participant invalide" });
    }

    const ids = [...new Set([String(req.user.id), ...demandes.map(String)])];

    const utilisateurs = await User.find({
      _id: { $in: ids },
      statut: "actif",
    });
    if (utilisateurs.length !== ids.length) {
      return res.status(404).json({ message: "Participant introuvable" });
    }

    if (type === "direct") {
      if (ids.length !== 2) {
        return res.status(400).json({
          message: "Une conversation directe a exactement 2 participants",
        });
      }
      const existante = await Conversation.findOne({
        type: "direct",
        participants: { $all: ids, $size: 2 },
      });
      if (existante) return res.status(200).json(existante);
    } else {
      if (!nom) {
        return res.status(400).json({ message: "Nom du groupe obligatoire" });
      }
      if (ids.length < 3) {
        return res
          .status(400)
          .json({ message: "Un groupe a au moins 3 participants" });
      }
    }

    const conversation = await Conversation.create({
      type,
      nom: type === "groupe" ? nom : undefined,
      participants: ids,
      createur: req.user.id,
    });
    res.status(201).json(conversation);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMesConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .populate("participants", AUTEUR)
      .sort({ dernier_message_date: -1 });

    const resultat = await Promise.all(
      conversations.map(async (c) => {
        const dernier = await Message.findOne({ conversation: c._id })
          .sort({ createdAt: -1 })
          .populate("auteur", "nom prenom");
        const non_lus = await Message.countDocuments({
          conversation: c._id,
          auteur: { $ne: req.user.id },
          lu_par: { $ne: req.user.id },
        });
        return { ...c.toObject(), dernier_message: dernier, non_lus };
      }),
    );

    res.status(200).json(resultat);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getNonLus = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id,
    }).select("_id");

    const total = await Message.countDocuments({
      conversation: { $in: conversations.map((c) => c._id) },
      auteur: { $ne: req.user.id },
      lu_par: { $ne: req.user.id },
    });
    res.status(200).json({ non_lus: total });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { erreur } = await chargerConversation(req.params.id, req.user.id);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const limite = Math.min(parseInt(req.query.limite, 10) || 50, 100);
    const filtre = { conversation: req.params.id };
    if (req.query.avant) filtre.createdAt = { $lt: new Date(req.query.avant) };

    const messages = await Message.find(filtre)
      .sort({ createdAt: -1 })
      .limit(limite)
      .populate("auteur", AUTEUR);

    res.status(200).json(messages.reverse());
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.envoyerMessage = async (req, res) => {
  try {
    const { erreur, conversation } = await chargerConversation(
      req.params.id,
      req.user.id,
    );
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const contenu = (req.body.contenu || "").trim();
    if (!contenu) {
      return res.status(400).json({ message: "Message vide" });
    }

    const message = await Message.create({
      conversation: conversation._id,
      auteur: req.user.id,
      contenu,
      lu_par: [req.user.id],
    });

    conversation.dernier_message_date = message.createdAt;
    await conversation.save();

    await message.populate("auteur", AUTEUR);
    res.status(201).json(message);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.marquerLu = async (req, res) => {
  try {
    const { erreur } = await chargerConversation(req.params.id, req.user.id);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const resultat = await Message.updateMany(
      {
        conversation: req.params.id,
        auteur: { $ne: req.user.id },
        lu_par: { $ne: req.user.id },
      },
      { $addToSet: { lu_par: req.user.id } },
    );
    res.status(200).json({ marques: resultat.modifiedCount });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.supprimerMessage = async (req, res) => {
  try {
    if (!idValide(req.params.messageId)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }

    const estAdmin = ["admin", "super_admin"].includes(req.user.role);
    if (String(message.auteur) !== String(req.user.id) && !estAdmin) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    await message.deleteOne();
    res.status(200).json({ message: "Message supprimé" });
  } catch (error) {
    gererErreur(error, res);
  }
};
