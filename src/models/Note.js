const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    cours: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cours",
      required: true,
    },

    cc1: { type: Number, min: 0, max: 20, default: null },
    cc2: { type: Number, min: 0, max: 20, default: null },
    examen: { type: Number, min: 0, max: 20, default: null },

    validee: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

noteSchema.index({ etudiant: 1, cours: 1 }, { unique: true });

module.exports = mongoose.model("Note", noteSchema);
