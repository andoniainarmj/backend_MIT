const mongoose = require("mongoose");

const contenuSchema = new mongoose.Schema(
  {
    page: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    section: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    donnees: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ordre: {
      type: Number,
      default: 0,
    },

    publie: {
      type: Boolean,
      default: true,
    },

    modifie_par: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

contenuSchema.index({ page: 1, section: 1 }, { unique: true });

module.exports = mongoose.model("Contenu", contenuSchema);
