const mongoose = require("mongoose");

const offreAlternanceSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    date_publication: {
      type: Date,
      default: Date.now,
    },

    statut: {
      type: String,
      default: "ouverte",
      enum: ["ouverte", "fermee"],
    },

    entreprise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Entreprise",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("OffreAlternance", offreAlternanceSchema);
