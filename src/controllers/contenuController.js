const Contenu = require("../models/Contenu");
const { gererErreur } = require("../utils/erreurs");

const SLUG = /^[a-z0-9-]{1,50}$/;
const TAILLE_MAX = 50000;

const lireSlugs = (params) => {
  const page = String(params.page || "").toLowerCase();
  const section =
    params.section === undefined ? undefined : String(params.section).toLowerCase();
  if (!SLUG.test(page) || (section !== undefined && !SLUG.test(section))) {
    return null;
  }
  return { page, section };
};

// Public : toutes les sections publiées d'une page
exports.getPage = async (req, res) => {
  try {
    const slugs = lireSlugs(req.params);
    if (!slugs) return res.status(400).json({ message: "Page invalide" });

    const sections = await Contenu.find({ page: slugs.page, publie: true }).sort({
      ordre: 1,
      section: 1,
    });

    const resultat = {};
    sections.forEach((s) => {
      resultat[s.section] = s.donnees;
    });

    res.status(200).json({
      page: slugs.page,
      ordre: sections.map((s) => s.section),
      sections: resultat,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

// Public : une seule section
exports.getSection = async (req, res) => {
  try {
    const slugs = lireSlugs(req.params);
    if (!slugs) return res.status(400).json({ message: "Page ou section invalide" });

    const contenu = await Contenu.findOne({
      page: slugs.page,
      section: slugs.section,
      publie: true,
    });
    if (!contenu) {
      return res.status(404).json({ message: "Section introuvable" });
    }
    res.status(200).json(contenu.donnees);
  } catch (error) {
    gererErreur(error, res);
  }
};

// Admin : tout, y compris les sections non publiées
exports.listerContenus = async (req, res) => {
  try {
    const filtre = {};
    if (req.query.page) filtre.page = String(req.query.page).toLowerCase();

    const contenus = await Contenu.find(filtre)
      .populate("modifie_par", "nom prenom")
      .sort({ page: 1, ordre: 1, section: 1 });
    res.status(200).json(contenus);
  } catch (error) {
    gererErreur(error, res);
  }
};

// Admin : créer ou remplacer une section
exports.enregistrerSection = async (req, res) => {
  try {
    const slugs = lireSlugs(req.params);
    if (!slugs) return res.status(400).json({ message: "Page ou section invalide" });

    const { donnees, ordre, publie } = req.body;

    if (!donnees || typeof donnees !== "object" || Array.isArray(donnees)) {
      return res
        .status(400)
        .json({ message: "« donnees » doit être un objet JSON" });
    }
    if (JSON.stringify(donnees).length > TAILLE_MAX) {
      return res.status(400).json({ message: "Contenu trop volumineux" });
    }
    if (ordre !== undefined && typeof ordre !== "number") {
      return res.status(400).json({ message: "« ordre » doit être un nombre" });
    }
    if (publie !== undefined && typeof publie !== "boolean") {
      return res
        .status(400)
        .json({ message: "« publie » doit être true ou false" });
    }

    const modifications = { donnees, modifie_par: req.user.id };
    if (ordre !== undefined) modifications.ordre = ordre;
    if (publie !== undefined) modifications.publie = publie;

    const contenu = await Contenu.findOneAndUpdate(
      { page: slugs.page, section: slugs.section },
      { $set: modifications },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    res.status(200).json(contenu);
  } catch (error) {
    gererErreur(error, res);
  }
};

// Admin : supprimer une section (la page retrouve son texte par défaut côté site)
exports.supprimerSection = async (req, res) => {
  try {
    const slugs = lireSlugs(req.params);
    if (!slugs) return res.status(400).json({ message: "Page ou section invalide" });

    const contenu = await Contenu.findOneAndDelete({
      page: slugs.page,
      section: slugs.section,
    });
    if (!contenu) {
      return res.status(404).json({ message: "Section introuvable" });
    }
    res.status(200).json({ message: "Section supprimée" });
  } catch (error) {
    gererErreur(error, res);
  }
};