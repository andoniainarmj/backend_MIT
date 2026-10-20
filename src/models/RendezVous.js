const mongoose = require("mongoose");

const rendezVousSchema = new mongoose.Schema(
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

    motif: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    debut: {
      type: Date,
      required: true,
    },

    fin: {
      type: Date,
      required: true,
    },

    statut: {
      type: String,
      default: "en_attente",
      enum: ["en_attente", "confirme", "refuse", "annule"],
    },

    lien_visio: {
      type: String,
      trim: true,
    },

    raison: {
      type: String,
      trim: true,
    },

    traite_par: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

rendezVousSchema.index({ debut: 1 });

module.exports = mongoose.model("RendezVous", rendezVousSchema);