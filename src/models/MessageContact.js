const mongoose = require("mongoose");

const messageContactSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    sujet: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    date_envoi: {
      type: Date,
      default: Date.now,
    },

    statut: {
      type: String,
      default: "non_lu",
      enum: ["non_lu", "lu", "traite"],
    },

    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("MessageContact", messageContactSchema);
