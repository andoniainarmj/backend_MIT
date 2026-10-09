const mongoose = require("mongoose");
const Log = require("../models/Log");
const Session = require("../models/Session");
const User = require("../models/User");
const Configuration = require("../models/Configuration");
const CompteurRequetes = require("../models/CompteurRequetes");
const { obtenirConfig } = require("../utils/configuration");
const { gererErreur } = require("../utils/erreurs");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));

const debutDuJour = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const construireFiltreLogs = (query) => {
  const filtre = {};
  if (query.severite) filtre.severite = query.severite;
  if (query.utilisateur && idValide(query.utilisateur)) {
    filtre.utilisateur = query.utilisateur;
  }
  if (query.action) filtre.action = query.action;
  if (query.du || query.au) {
    filtre.createdAt = {};
    if (query.du) filtre.createdAt.$gte = new Date(query.du);
    if (query.au) filtre.createdAt.$lte = new Date(query.au);
  }
  return filtre;
};

exports.getVueEnsemble = async (req, res) => {
  try {
    const config = await obtenirConfig();
    const aujourdhui = debutDuJour();

    const jour = new Date().toISOString().slice(0, 10);
    const il7j = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [
      utilisateursActifs,
      administrateurs,
      sessionsActives,
      logsAujourdhui,
      erreursAujourdhui,
      derniersLogs,
      compteurs,
    ] = await Promise.all([
      User.countDocuments({ statut: "actif" }),
      User.countDocuments({ role: { $in: ["admin", "super_admin"] } }),
      Session.countDocuments({ active: true }),
      Log.countDocuments({ createdAt: { $gte: aujourdhui } }),
      Log.countDocuments({
        createdAt: { $gte: aujourdhui },
        severite: "ERROR",
      }),
      Log.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("utilisateur", "nom prenom"),
      CompteurRequetes.find({ jour: { $gte: il7j } }).sort({ jour: 1 }),
    ]);

    const compteurDuJour = compteurs.find((c) => c.jour === jour);

    res.status(200).json({
      systeme: {
        serveur: "Opérationnel",
        base_de_donnees:
          mongoose.connection.readyState === 1 ? "Connecté" : "Déconnecté",
        uptime_secondes: Math.round(process.uptime()),
        mode_maintenance: config.mode_maintenance,
      },
      utilisateurs_actifs: utilisateursActifs,
      administrateurs,
      sessions_actives: sessionsActives,
      logs_aujourdhui: logsAujourdhui,
      erreurs_aujourdhui: erreursAujourdhui,
      requetes_api_aujourdhui: compteurDuJour ? compteurDuJour.total : 0,
      requetes_api_7_jours: compteurs.map((c) => ({
        jour: c.jour,
        total: c.total,
      })),
      derniers_logs: derniersLogs,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getAdministrateurs = async (req, res) => {
  try {
    const admins = await User.find({
      role: { $in: ["admin", "super_admin"] },
    })
      .select("nom prenom email role statut")
      .sort({ nom: 1 });

    const resultat = await Promise.all(
      admins.map(async (a) => {
        const derniere = await Session.findOne({ utilisateur: a._id }).sort({
          createdAt: -1,
        });
        return {
          ...a.toObject(),
          derniere_connexion: derniere ? derniere.createdAt : null,
        };
      }),
    );
    res.status(200).json(resultat);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getLogs = async (req, res) => {
  try {
    const filtre = construireFiltreLogs(req.query);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limite = Math.min(parseInt(req.query.limite, 10) || 10, 100);

    const total = await Log.countDocuments(filtre);
    const logs = await Log.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limite)
      .limit(limite)
      .populate("utilisateur", "nom prenom");

    res.status(200).json({
      total,
      page,
      pages: Math.ceil(total / limite),
      logs,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.exporterLogs = async (req, res) => {
  try {
    const logs = await Log.find(construireFiltreLogs(req.query))
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate("utilisateur", "nom prenom");

    const echapper = (valeur) =>
      `"${String(valeur === undefined || valeur === null ? "" : valeur).replace(/"/g, '""')}"`;

    const lignes = [
      ["Horodatage", "Utilisateur", "Action", "Détails", "IP", "Sévérité"]
        .map(echapper)
        .join(","),
    ];
    logs.forEach((l) => {
      const auteur = l.utilisateur
        ? `${l.utilisateur.prenom} ${l.utilisateur.nom}`
        : l.email_tente || "Système";
      lignes.push(
        [
          l.createdAt.toISOString(),
          auteur,
          l.action,
          l.details,
          l.ip,
          l.severite,
        ]
          .map(echapper)
          .join(","),
      );
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=logs.csv");
    res.status(200).send("\ufeff" + lignes.join("\n"));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getSessionsActives = async (req, res) => {
  try {
    const sessions = await Session.find({ active: true })
      .populate("utilisateur", "nom prenom role")
      .sort({ derniere_activite: -1 });
    res.status(200).json(sessions);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deconnecterSession = async (req, res) => {
  try {
    if (!idValide(req.params.id)) {
      return res.status(400).json({ message: "Id invalide" });
    }
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true },
    );
    if (!session) {
      return res.status(404).json({ message: "Session introuvable" });
    }
    res.status(200).json({ message: "Session déconnectée" });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.deconnexionGlobale = async (req, res) => {
  try {
    const resultat = await Session.updateMany(
      { active: true },
      { active: false },
    );
    res.status(200).json({
      message: "Tous les appareils ont été déconnectés",
      sessions_fermees: resultat.modifiedCount,
    });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.getConnexionsEchouees = async (req, res) => {
  try {
    const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const echecs = await Log.find({
      action: "Échec connexion",
      createdAt: { $gte: depuis },
    }).sort({ createdAt: -1 });

    res.status(200).json({ total_24h: echecs.length, echecs });
  } catch (error) {
    gererErreur(error, res);
  }
};

const CHAMPS_CONFIG = [
  "mode_maintenance",
  "inscriptions_ouvertes",
  "sauvegarde_auto",
  "double_facteur_obligatoire",
  "rate_limiting",
  "notifications_email",
];

exports.getConfiguration = async (req, res) => {
  try {
    const config = await obtenirConfig();
    res.status(200).json(config);
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.updateConfiguration = async (req, res) => {
  try {
    const modifications = {};
    for (const champ of CHAMPS_CONFIG) {
      if (req.body[champ] !== undefined) {
        if (typeof req.body[champ] !== "boolean") {
          return res
            .status(400)
            .json({ message: `${champ} doit être true ou false` });
        }
        modifications[champ] = req.body[champ];
      }
    }

    await obtenirConfig();
    const config = await Configuration.findOneAndUpdate(
      { cle: "global" },
      modifications,
      { new: true },
    );
    res.status(200).json(config);
  } catch (error) {
    gererErreur(error, res);
  }
};
