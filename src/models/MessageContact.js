const mongoose = require("mongoose");

const messageContactSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },

    prenom: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    telephone: {
      type: String,
      trim: true,
    },

    entreprise: {
      type: String,
      trim: true,
    },

    sujet: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    date_envoi: {
      type: Date,
      default: Date.now,
    },

    statut: {
      type: String,
      default: "non_lu",
      enum: ["non_lu", "lu", "traite"],
    },

    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reponse: {
      type: String,
      trim: true,
    },

    date_reponse: {
      type: Date,
    },

    repondu_par: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("MessageContact", messageContactSchema);
