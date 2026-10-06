const mongoose = require("mongoose");

const salleSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    type: {
      type: String,
      default: "cours_theorique",
      enum: ["cours_theorique", "labo", "amphi", "autre"],
    },

    capacite: {
      type: Number,
      required: true,
      min: 1,
    },

    equipements: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Salle", salleSchema);
