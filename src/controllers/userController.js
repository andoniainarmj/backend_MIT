const mongoose = require("mongoose");
const User = require("../models/User");
const Session = require("../models/Session");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  emailValide,
  motDePasseValide,
  MESSAGE_EMAIL,
  MESSAGE_MOT_DE_PASSE,
} = require("../utils/validation");
const { enregistrerLog } = require("../utils/journal");
const { obtenirConfig } = require("../utils/configuration");

const ROLES = ["super_admin", "admin", "enseignant", "etudiant", "entreprise"];
const ROLES_PROTEGES = ["super_admin", "admin"];

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
    const config = await obtenirConfig();
    if (!config.inscriptions_ouvertes) {
      return res.status(403).json({ message: "Les inscriptions sont fermées" });
    }

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

    const emailNormalise = String(email).toLowerCase();

    const echec = async (status, message, details) => {
      await enregistrerLog({
        action: "Échec connexion",
        details,
        email_tente: emailNormalise,
        ip: req.ip,
        severite: "ERROR",
      });
      return res.status(status).json({ message });
    };

    const user = await User.findOne({ email: emailNormalise });

    if (!user) {
      return echec(
        401,
        "Email ou mot de passe incorrect",
        "Utilisateur inconnu",
      );
    }

    if (user.statut === "inactif") {
      return echec(403, "Compte inactif", "Compte inactif");
    }

    const motDePasseCorrect = await bcrypt.compare(
      mot_de_passe,
      user.mot_de_passe,
    );

    if (!motDePasseCorrect) {
      return echec(
        401,
        "Email ou mot de passe incorrect",
        "Mot de passe erroné",
      );
    }

    const config = await obtenirConfig();
    if (config.mode_maintenance && user.role !== "super_admin") {
      return res
        .status(503)
        .json({ message: "Plateforme en maintenance, réessayez plus tard" });
    }

    const session = await Session.create({
      utilisateur: user._id,
      ip: req.ip,
      appareil: req.headers["user-agent"] || "Inconnu",
    });

    const token = jwt.sign(
      { id: user._id, role: user.role, sid: session._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    await enregistrerLog({
      utilisateur: user._id,
      action: "Connexion",
      details: "Session établie avec succès",
      ip: req.ip,
    });

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

    if (ROLES_PROTEGES.includes(role) && req.user.role !== "super_admin") {
      return res.status(403).json({
        message: "Seul le super admin peut créer un administrateur",
      });
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
      if (
        ROLES_PROTEGES.includes(cible.role) ||
        ROLES_PROTEGES.includes(req.body.role)
      ) {
        return res.status(403).json({
          message: "Seul le super admin peut gérer les administrateurs",
        });
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

    // Un changement de rôle ou une désactivation coupe les sessions ouvertes
    if (
      modifications.statut === "inactif" ||
      (modifications.role && modifications.role !== cible.role)
    ) {
      await Session.updateMany(
        { utilisateur: cible._id, active: true },
        { active: false },
      );
    }

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

    if (
      ROLES_PROTEGES.includes(cible.role) &&
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({
        message: "Seul le super admin peut supprimer un administrateur",
      });
    }

    await Session.updateMany(
      { utilisateur: cible._id, active: true },
      { active: false },
    );
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
