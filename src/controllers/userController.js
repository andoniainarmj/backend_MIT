const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  emailValide,
  motDePasseValide,
  MESSAGE_EMAIL,
  MESSAGE_MOT_DE_PASSE,
} = require("../utils/validation");

const ROLES = ["super_admin", "admin", "enseignant", "etudiant", "entreprise"];

const formatUser = (user) => ({
  id: user._id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  role: user.role,
  statut: user.statut,
  date_inscription: user.date_inscription,
  telephone: user.telephone,
  adresse: user.adresse,
  date_naissance: user.date_naissance,
  photo: user.photo,
  numero_etudiant: user.numero_etudiant,
  formation: user.formation,
  niveau: user.niveau,
  specialite: user.specialite,
  type_contrat: user.type_contrat,
});

const genererNumeroEtudiant = async () => {
  const annee = new Date().getFullYear();
  const dernier = await User.findOne({ numero_etudiant: { $exists: true } })
    .sort({ createdAt: -1 })
    .select("numero_etudiant");
  const suite = dernier
    ? parseInt(dernier.numero_etudiant.split("-")[2], 10) + 1
    : 1;
  return `MIT-${annee}-${String(suite).padStart(4, "0")}`;
};

const registerUser = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, role } = req.body;

    if (!nom || !prenom || !email || !mot_de_passe || !role) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires",
      });
    }

    if (!emailValide(email)) {
      return res.status(400).json({ message: MESSAGE_EMAIL });
    }

    if (!motDePasseValide(mot_de_passe)) {
      return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE });
    }

    if (!["etudiant", "entreprise"].includes(role)) {
      return res.status(400).json({
        message: "Rôle invalide pour l'inscription",
      });
    }

    const userExiste = await User.findOne({ email: email.toLowerCase() });

    if (userExiste) {
      return res.status(400).json({
        message: "Cet email existe déjà",
      });
    }

    const motDePasseHash = await bcrypt.hash(mot_de_passe, 10);

    const donnees = { nom, prenom, email, mot_de_passe: motDePasseHash, role };
    if (role === "etudiant") {
      donnees.numero_etudiant = await genererNumeroEtudiant();
    }

    const user = await User.create(donnees);

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: formatUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body;

    if (!email || !mot_de_passe) {
      return res.status(400).json({
        message: "Email et mot de passe obligatoires",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect",
      });
    }

    if (user.statut === "inactif") {
      return res.status(403).json({
        message: "Compte inactif",
      });
    }

    const motDePasseCorrect = await bcrypt.compare(
      mot_de_passe,
      user.mot_de_passe,
    );

    if (!motDePasseCorrect) {
      return res.status(401).json({
        message: "Email ou mot de passe incorrect",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    res.status(200).json({
      message: "Connexion réussie",
      token,
      user: formatUser(user),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-mot_de_passe")
      .populate("formation", "titre");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(formatUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const CHAMPS_PROFIL = [
  "nom",
  "prenom",
  "telephone",
  "adresse",
  "date_naissance",
  "photo",
];
const CHAMPS_ADMIN = [
  ...CHAMPS_PROFIL,
  "statut",
  "formation",
  "niveau",
  "specialite",
  "type_contrat",
];

const construireModifications = async (body, champs) => {
  const modifications = {};
  champs.forEach((champ) => {
    if (body[champ] !== undefined && body[champ] !== "") {
      modifications[champ] = body[champ];
    }
  });
  if (body.email) modifications.email = body.email;
  if (body.mot_de_passe) {
    modifications.mot_de_passe = await bcrypt.hash(body.mot_de_passe, 10);
  }
  return modifications;
};

const validerEmailEtMotDePasse = (body) => {
  if (body.email && !emailValide(body.email)) return MESSAGE_EMAIL;
  if (body.mot_de_passe && !motDePasseValide(body.mot_de_passe)) {
    return MESSAGE_MOT_DE_PASSE;
  }
  return null;
};

const gererErreurEcriture = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "Cet email existe déjà" });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: "Erreur serveur" });
};

const updateMe = async (req, res) => {
  try {
    const erreur = validerEmailEtMotDePasse(req.body);
    if (erreur) return res.status(400).json({ message: erreur });

    const modifications = await construireModifications(
      req.body,
      CHAMPS_PROFIL,
    );

    const user = await User.findByIdAndUpdate(req.user.id, modifications, {
      new: true,
      runValidators: true,
    }).select("-mot_de_passe");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(formatUser(user));
  } catch (error) {
    gererErreurEcriture(error, res);
  }
};

const createUser = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, role } = req.body;

    if (!nom || !prenom || !email || !mot_de_passe || !role) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires",
      });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    if (role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const erreur = validerEmailEtMotDePasse(req.body);
    if (erreur) return res.status(400).json({ message: erreur });

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(400).json({ message: "Cet email existe déjà" });
    }

    const donnees = await construireModifications(req.body, CHAMPS_ADMIN);
    donnees.nom = nom;
    donnees.prenom = prenom;
    donnees.email = email;
    donnees.role = role;
    if (role === "etudiant") {
      donnees.numero_etudiant = await genererNumeroEtudiant();
    }

    const user = await User.create(donnees);

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: formatUser(user),
    });
  } catch (error) {
    gererErreurEcriture(error, res);
  }
};

const getUsers = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.role) filtre.role = req.query.role;
    if (req.query.statut) filtre.statut = req.query.statut;
    if (req.query.formation) filtre.formation = req.query.formation;

    const users = await User.find(filtre)
      .select("-mot_de_passe")
      .populate("formation", "titre")
      .sort({ createdAt: -1 });

    res.status(200).json(users.map(formatUser));
  } catch (error) {
    gererErreurEcriture(error, res);
  }
};

const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const user = await User.findById(req.params.id)
      .select("-mot_de_passe")
      .populate("formation", "titre");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(formatUser(user));
  } catch (error) {
    gererErreurEcriture(error, res);
  }
};

const updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const erreur = validerEmailEtMotDePasse(req.body);
    if (erreur) return res.status(400).json({ message: erreur });

    const cible = await User.findById(req.params.id);
    if (!cible) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (req.user.role !== "super_admin") {
      if (cible.role === "super_admin" || req.body.role === "super_admin") {
        return res.status(403).json({ message: "Accès refusé" });
      }
    }

    const modifications = await construireModifications(req.body, CHAMPS_ADMIN);
    if (req.body.role) {
      if (!ROLES.includes(req.body.role)) {
        return res.status(400).json({ message: "Rôle invalide" });
      }
      modifications.role = req.body.role;
    }

    const user = await User.findByIdAndUpdate(req.params.id, modifications, {
      new: true,
      runValidators: true,
    }).select("-mot_de_passe");

    res.status(200).json(formatUser(user));
  } catch (error) {
    gererErreurEcriture(error, res);
  }
};

const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    if (req.params.id === req.user.id) {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    }

    const cible = await User.findById(req.params.id);
    if (!cible) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    if (cible.role === "super_admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ message: "Accès refusé" });
    }

    await cible.deleteOne();

    res.status(200).json({ message: "Utilisateur supprimé" });
  } catch (error) {
    gererErreurEcriture(error, res);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};
