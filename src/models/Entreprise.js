const mongoose = require("mongoose");

const entrepriseSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },

    secteur_activite: {
      type: String,
      required: true,
      trim: true,
    },

    adresse: {
      type: String,
      required: true,
      trim: true,
    },

    logo: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Entreprise", entrepriseSchema);
