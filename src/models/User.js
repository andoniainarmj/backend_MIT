const mongoose = require("mongoose");

//creation des propriétés dans l'entités utilisateurs
const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
      trim: true,
    },

    prenom: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    mot_de_passe: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      required: true,
      enum: ["admin", "etudiant", "entreprise"],
    },

    date_inscription: {
      type: Date,
      default: Date.now,
    },

    statut: {
      type: String,
      default: "actif",
      enum: ["actif", "inactif"],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
