const User = require("../models/User");
const bcrypt = require("bcryptjs");

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

module.exports = {
  registerUser,
};
