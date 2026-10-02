const mongoose = require("mongoose");

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
      enum: ["super_admin", "admin", "enseignant", "etudiant", "entreprise"],
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

    telephone: { type: String, trim: true },
    adresse: { type: String, trim: true },
    date_naissance: { type: Date },
    photo: { type: String, trim: true },

    // Étudiant
    numero_etudiant: { type: String, unique: true, sparse: true },
    formation: { type: mongoose.Schema.Types.ObjectId, ref: "Formation" },
    niveau: { type: String, trim: true },

    // Enseignant
    specialite: { type: String, trim: true },
    type_contrat: { type: String, enum: ["temps_plein", "vacataire"] },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema);
