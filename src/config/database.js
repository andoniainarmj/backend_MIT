const mongoose = require("mongoose");
const dns = require("dns");

// Utiliser Google DNS pour résoudre les serveurs MongoDB Atlas
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connecté avec succès");
  } catch (error) {
    console.error("Erreur MongoDB :", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;