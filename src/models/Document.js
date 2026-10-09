const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    categorie: {
      type: String,
      trim: true,
    },

    fichier: {
      type: String,
      required: true,
      trim: true,
    },

    taille: {
      type: Number,
      default: 0,
    },

    date_ajout: {
      type: Date,
      default: Date.now,
    },

    visibilite: {
      type: String,
      default: "formation",
      enum: ["public", "formation", "prive"],
    },

    formation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formation",
    },

    proprietaire: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Document", documentSchema);
