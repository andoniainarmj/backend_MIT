const mongoose = require("mongoose");

const formationSchema = new mongoose.Schema(
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

    duree: {
      type: String,
      required: true,
      trim: true,
    },

    niveau: {
      type: String,
      required: true,
      trim: true,
    },

    categorie: {
      type: String,
      trim: true,
    },

    rythme: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Formation", formationSchema);
