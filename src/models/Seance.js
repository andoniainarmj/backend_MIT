const mongoose = require("mongoose");

const seanceSchema = new mongoose.Schema(
  {
    cours: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cours",
      required: true,
    },

    enseignant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    salle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salle",
      required: true,
    },

    formation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Formation",
      required: true,
    },

    niveau: {
      type: String,
      required: true,
      trim: true,
    },

    debut: {
      type: Date,
      required: true,
    },

    fin: {
      type: Date,
      required: true,
    },

    type: {
      type: String,
      default: "cours",
      enum: ["cours", "tp", "projet", "examen", "autre"],
    },

    publiee: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Seance", seanceSchema);
