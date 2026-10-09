const mongoose = require("mongoose");

const depenseSchema = new mongoose.Schema(
  {
    libelle: {
      type: String,
      required: true,
      trim: true,
    },

    montant: {
      type: Number,
      required: true,
      min: 0,
    },

    departement: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Depense", depenseSchema);
