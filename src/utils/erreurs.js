const gererErreur = (error, res) => {
  if (error.code === 11000) {
    return res.status(409).json({ message: "Cet enregistrement existe déjà" });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: error.message });
  }
  console.error(error);
  return res.status(500).json({ message: "Erreur serveur" });
};

module.exports = { gererErreur };
