const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    ip: {
      type: String,
      trim: true,
    },

    appareil: {
      type: String,
      trim: true,
    },

    derniere_activite: {
      type: Date,
      default: Date.now,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Session", sessionSchema);
