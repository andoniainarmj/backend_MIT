const mongoose = require("mongoose");
const MessageContact = require("../models/MessageContact");

exports.createMessage = async (req, res) => {
  try {
    const message = await MessageContact.create(req.body);
    res.status(201).json(message);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const messages = await MessageContact.find().populate(
      "utilisateur",
      "nom prenom email",
    );
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getMessageById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const message = await MessageContact.findById(req.params.id).populate(
      "utilisateur",
      "nom prenom email",
    );
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }
    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const message = await MessageContact.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }
    res.status(200).json(message);
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const message = await MessageContact.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }
    res.status(200).json({ message: "Message supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};
