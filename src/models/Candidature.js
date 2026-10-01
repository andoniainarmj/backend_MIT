const mongoose = require("mongoose");

const candidatureSchema = new mongoose.Schema(
  {
    date_candidature: {
      type: Date,
      default: Date.now,
    },

    statut: {
      type: String,
      default: "en_attente",
      enum: ["en_attente", "acceptee", "refusee"],
    },

    cv: {
      type: String,
      required: true,
      trim: true,
    },

    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    offre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OffreAlternance",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

candidatureSchema.index({ utilisateur: 1, offre: 1 }, { unique: true });

module.exports = mongoose.model("Candidature", candidatureSchema);
