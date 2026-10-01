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

    fichier: {
      type: String,
      required: true,
      trim: true,
    },

    date_ajout: {
      type: Date,
      default: Date.now,
    },

    formation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formation",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Document", documentSchema);
