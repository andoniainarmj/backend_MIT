const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe, role } = req.body;

    // Vérification que les champs sont remplis
    if (!nom || !prenom || !email || !mot_de_passe || !role) {
      return res.status(400).json({
        message: "Tous les champs sont obligatoires",
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
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        statut: user.statut,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};

//login
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
      user: {
        id: user._id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        statut: user.statut,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erreur serveur",
    });
  }
};


//module exports avec login et registre
module.exports = {
  registerUser,
  loginUser,
};