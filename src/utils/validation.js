const emailValide = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
};

const motDePasseValide = (motDePasse) => {
  return (
    typeof motDePasse === "string" &&
    motDePasse.length >= 8 &&
    /[A-Za-z]/.test(motDePasse) &&
    /\d/.test(motDePasse)
  );
};

const MESSAGE_EMAIL = "Format d'email invalide";
const MESSAGE_MOT_DE_PASSE =
  "Le mot de passe doit contenir au moins 8 caractères, avec au moins une lettre et un chiffre";

module.exports = {
  emailValide,
  motDePasseValide,
  MESSAGE_EMAIL,
  MESSAGE_MOT_DE_PASSE,
};
