const mongoose = require("mongoose");

const paiementSchema = new mongoose.Schema(
  {
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      default: "Scolarité",
      trim: true,
    },

    montant: {
      type: Number,
      required: true,
      min: 0,
    },

    echeance: {
      type: Date,
      required: true,
    },

    statut: {
      type: String,
      default: "en_attente",
      enum: ["en_attente", "paye", "annule"],
    },

    date_paiement: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Paiement", paiementSchema);
