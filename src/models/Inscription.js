const mongoose = require("mongoose");

const inscriptionSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    formation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formation",
      required: true,
    },

    date_inscription: {
      type: Date,
      default: Date.now,
    },

    statut: {
      type: String,
      default: "en_attente",
      enum: ["en_attente", "validee", "annulee"],
    },
  },
  {
    timestamps: true,
  },
);

inscriptionSchema.index({ utilisateur: 1, formation: 1 }, { unique: true });

module.exports = mongoose.model("Inscription", inscriptionSchema);
