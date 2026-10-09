const mongoose = require("mongoose");

const conventionSchema = new mongoose.Schema(
  {
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    entreprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entreprise",
      required: true,
    },

    poste: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      default: "alternance",
      enum: ["alternance", "stage"],
    },

    date_debut: {
      type: Date,
      required: true,
    },

    date_fin: {
      type: Date,
      required: true,
    },

    tuteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    statut: {
      type: String,
      default: "validation",
      enum: ["validation", "active", "terminee", "annulee"],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Convention", conventionSchema);
