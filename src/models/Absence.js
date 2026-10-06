const mongoose = require("mongoose");

const absenceSchema = new mongoose.Schema(
  {
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seance",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    justifiee: {
      type: Boolean,
      default: false,
    },
    motif: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Absence", absenceSchema);
