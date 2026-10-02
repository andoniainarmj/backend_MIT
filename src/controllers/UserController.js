const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const formatUser = (user) => ({
  id: user._id,
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  role: user.role,
  statut: user.statut,
  date_inscription: user.date_inscription,
});

const registerUser = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, role } = req.body;

    // Vérification que les champs sont remplis
    if (!nom || !prenom || !email || !mot_de_passe || !role) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires",
      });
    }

    // Seuls ces rôles sont autorisés à l'inscription publique
    if (!["etudiant", "entreprise"].includes(role)) {
      return res.status(400).json({
        message: "Rôle invalide pour l'inscription",
      });
    }

    // Vérification si l'email existe déjà
    const userExiste = await User.findOne({ email });

    if (userExiste) {
      return res.status(400).json({
        message: "Cet email existe déjà",
      });
    }

    // Hacher le mot de passe
    const motDePasseHash = await bcrypt.hash(mot_de_passe, 10);

    // Créer l'utilisateur
    const user = await User.create({
      nom,
      prenom,
      email,
      mot_de_passe: motDePasseHash,
      role,
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: formatUser(user),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erreur serveur",
    });
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

    const motDePasseValide = await bcrypt.compare(
      mot_de_passe,
      user.mot_de_passe,
    );

    if (!motDePasseValide) {
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

    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-mot_de_passe");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(formatUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const updateMe = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe } = req.body;
    const modifications = {};

    if (nom) modifications.nom = nom;
    if (prenom) modifications.prenom = prenom;
    if (email) modifications.email = email;
    if (mot_de_passe) {
      modifications.mot_de_passe = await bcrypt.hash(mot_de_passe, 10);
    }

    const user = await User.findByIdAndUpdate(req.user.id, modifications, {
      new: true,
      runValidators: true,
    }).select("-mot_de_passe");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(formatUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Cet email existe déjà" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-mot_de_passe");
    res.status(200).json(users.map(formatUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const user = await User.findById(req.params.id).select("-mot_de_passe");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(formatUser(user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }

    const { nom, prenom, email, mot_de_passe, role, statut } = req.body;
    const modifications = {};

    if (nom) modifications.nom = nom;
    if (prenom) modifications.prenom = prenom;
    if (email) modifications.email = email;
    if (role) modifications.role = role;
    if (statut) modifications.statut = statut;
    if (mot_de_passe) {
      modifications.mot_de_passe = await bcrypt.hash(mot_de_passe, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, modifications, {
      new: true,
      runValidators: true,
    }).select("-mot_de_passe");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json(formatUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Cet email existe déjà" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
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

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json({ message: "Utilisateur supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};