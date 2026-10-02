require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const [email, motDePasse, role = "admin"] = process.argv.slice(2);

const creerAdmin = async () => {
  if (!email || !motDePasse) {
    console.log(
      "Usage : node src/scripts/createAdmin.js email motdepasse [admin|super_admin]",
    );
    process.exit(1);
  }

  if (!["admin", "super_admin"].includes(role)) {
    console.log("Le rôle doit être admin ou super_admin");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existe = await User.findOne({ email: email.toLowerCase() });
    if (existe) {
      existe.role = role;
      await existe.save();
      console.log(`Compte existant passé au rôle ${role}`);
      process.exit(0);
    }

    const hash = await bcrypt.hash(motDePasse, 10);

    await User.create({
      nom: "Admin",
      prenom: "Principal",
      email,
      mot_de_passe: hash,
      role,
    });

    console.log(`${role} créé avec succès`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

creerAdmin();