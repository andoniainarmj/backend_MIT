require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const [email, motDePasse] = process.argv.slice(2);

const creerAdmin = async () => {
  if (!email || !motDePasse) {
    console.log("Usage : node src/scripts/createAdmin.js email motdepasse");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      console.log("Cet email existe déjà");
      process.exit(1);
    }

    const hash = await bcrypt.hash(motDePasse, 10);

    await User.create({
      nom: "Admin",
      prenom: "Principal",
      email,
      mot_de_passe: hash,
      role: "admin",
    });

    console.log("Admin créé avec succès");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

creerAdmin();