const mongoose = require("mongoose");

const coursSchema = new mongoose.Schema(
  {
    titre: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    description: {
      type: String,
      trim: true,
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

    semestre: {
      type: String,
      required: true,
      trim: true,
    },

    enseignant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    ects: {
      type: Number,
      required: true,
      min: 0,
    },

    coefficient: {
      type: Number,
      default: 1,
      min: 0,
    },

    heures_semaine: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Cours", coursSchema);
