require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Formation = require("../models/Formation");
const Salle = require("../models/Salle");
const Cours = require("../models/Cours");
const User = require("../models/User");
const Entreprise = require("../models/Entreprise");
const OffreAlternance = require("../models/OffreAlternance");

const MOT_DE_PASSE_DEMO = "Demo12345";

// Crée l'élément s'il n'existe pas, ne modifie jamais un élément existant
const assurer = (Model, filtre, donnees) =>
  Model.findOneAndUpdate(
    filtre,
    { $setOnInsert: donnees },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

const prochainNumero = async () => {
  const annee = new Date().getFullYear();
  const comptes = await User.find({
    numero_etudiant: { $exists: true },
  }).select("numero_etudiant");
  const max = comptes.reduce((plusGrand, u) => {
    const n = parseInt(u.numero_etudiant.split("-")[2], 10);
    return n > plusGrand ? n : plusGrand;
  }, 0);
  return `MIT-${annee}-${String(max + 1).padStart(4, "0")}`;
};

const assurerEtudiant = async (email, nom, prenom, hash, formation) => {
  const existant = await User.findOne({ email });
  if (existant) return existant;
  return User.create({
    nom,
    prenom,
    email,
    mot_de_passe: hash,
    role: "etudiant",
    numero_etudiant: await prochainNumero(),
    formation: formation._id,
    niveau: "L2",
  });
};

const lancer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const hash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 10);

    // Formations de la maquette
    const fullStack = await assurer(
      Formation,
      { titre: "Développeur Full-Stack" },
      {
        description:
          "Maîtrisez les architectures web modernes, le cloud computing et les pipelines de déploiement continu.",
        duree: "3 ans d'études",
        niveau: "Bac+3",
        categorie: "Bachelors (Bac+3)",
        rythme: "Alternance dès la 1ère année",
      },
    );
    await assurer(
      Formation,
      { titre: "Métiers de l'informatique" },
      {
        description:
          "Les métiers de l'informatique consistent à concevoir, développer, sécuriser et maintenir les outils.",
        duree: "2 ans d'études",
        niveau: "Bac+5",
        categorie: "Masters (Bac+5)",
        rythme: "Rythme alterné optimisé",
      },
    );
    await assurer(
      Formation,
      { titre: "Cybersécurité" },
      {
        description:
          "Protégez les infrastructures critiques et configurez la sécurité des réseaux face aux nouvelles menaces.",
        duree: "2 ans d'études",
        niveau: "Bac+5",
        categorie: "Expertise (Bac+5)",
        rythme: "Immergé 4j en entreprise",
      },
    );

    // Salles
    await assurer(
      Salle,
      { nom: "Salle 101" },
      { type: "cours_theorique", capacite: 30 },
    );
    await assurer(
      Salle,
      { nom: "Labo Informatique 1" },
      { type: "labo", capacite: 24, equipements: ["Postes", "Projecteur"] },
    );
    await assurer(Salle, { nom: "Amphi A" }, { type: "amphi", capacite: 120 });

    // Enseignants
    const prof1 = await assurer(
      User,
      { email: "prof1@mit.com" },
      {
        nom: "Rakoto",
        prenom: "Hery",
        mot_de_passe: hash,
        role: "enseignant",
        specialite: "Développement web",
        type_contrat: "temps_plein",
      },
    );
    const prof2 = await assurer(
      User,
      { email: "prof2@mit.com" },
      {
        nom: "Randria",
        prenom: "Voahangy",
        mot_de_passe: hash,
        role: "enseignant",
        specialite: "Bases de données",
        type_contrat: "vacataire",
      },
    );

    // Étudiants
    // Étudiants
    await assurerEtudiant(
      "etudiant1@mit.com",
      "Rabe",
      "Lanto",
      hash,
      fullStack,
    );
    await assurerEtudiant(
      "etudiant2@mit.com",
      "Andria",
      "Miora",
      hash,
      fullStack,
    );

    // Cours
    const cours = [
      {
        code: "ALGO201",
        titre: "Algorithmique Avancée",
        enseignant: prof1._id,
        ects: 4,
        coefficient: 3,
        heures: 4,
      },
      {
        code: "BDD202",
        titre: "Base de données NoSQL",
        enseignant: prof2._id,
        ects: 4,
        coefficient: 3,
        heures: 4,
      },
      {
        code: "WEB203",
        titre: "Développement Web React",
        enseignant: prof1._id,
        ects: 5,
        coefficient: 4,
        heures: 6,
      },
      {
        code: "ANG204",
        titre: "Anglais technique",
        enseignant: prof2._id,
        ects: 2,
        coefficient: 1,
        heures: 2,
      },
    ];
    for (const c of cours) {
      await assurer(
        Cours,
        { code: c.code },
        {
          titre: c.titre,
          formation: fullStack._id,
          niveau: "L2",
          semestre: "S4",
          enseignant: c.enseignant,
          ects: c.ects,
          coefficient: c.coefficient,
          heures_semaine: c.heures,
        },
      );
    }

    // Entreprise et offre
    const entreprise = await assurer(
      Entreprise,
      { nom: "Orange Madagascar" },
      {
        secteur_activite: "Télécommunications",
        adresse: "Antananarivo, Madagascar",
      },
    );
    await assurer(
      OffreAlternance,
      { titre: "Alternance développeur web", entreprise: entreprise._id },
      {
        description:
          "Poste en alternance de 12 mois au sein de l'équipe digitale.",
      },
    );

    console.log(
      "Données de départ créées (les éléments existants sont conservés).",
    );
    console.log(
      `Comptes de démonstration, mot de passe : ${MOT_DE_PASSE_DEMO}`,
    );
    console.log("  prof1@mit.com, prof2@mit.com (enseignants)");
    console.log("  etudiant1@mit.com, etudiant2@mit.com (étudiants)");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

lancer();
