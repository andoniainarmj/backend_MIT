const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Log = require("../models/Log");
const Session = require("../models/Session");
const User = require("../models/User");
const Configuration = require("../models/Configuration");
const CompteurRequetes = require("../models/CompteurRequetes");
const { obtenirConfig } = require("../utils/configuration");
const { gererErreur } = require("../utils/erreurs");
const { enregistrerLog } = require("../utils/journal");
const {
  emailValide,
  motDePasseValide,
  MESSAGE_EMAIL,
  MESSAGE_MOT_DE_PASSE,
} = require("../utils/validation");

const idValide = (id) => mongoose.Types.ObjectId.isValid(String(id));
const ROLES_ADMIN = ["admin", "super_admin"];
const ROLES_ORDINAIRES = ["enseignant", "etudiant", "entreprise"];

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

const formatAdmin = (u) => ({
  id: u._id,
  nom: u.nom,
  prenom: u.prenom,
  email: u.email,
  role: u.role,
  statut: u.statut,
});

const chargerUtilisateur = async (id) => {
  if (!idValide(id)) {
    return { erreur: { status: 400, message: "Id invalide" } };
  }
  const cible = await User.findById(id);
  if (!cible) {
    return { erreur: { status: 404, message: "Utilisateur introuvable" } };
  }
  return { cible };
};

const chargerAdmin = async (id) => {
  const { erreur, cible } = await chargerUtilisateur(id);
  if (erreur) return { erreur };
  if (!ROLES_ADMIN.includes(cible.role)) {
    return {
      erreur: {
        status: 400,
        message: "Cet utilisateur n'est pas administrateur",
      },
    };
  }
  return { cible };
};

const estDernierSuperAdmin = async (cible) => {
  if (cible.role !== "super_admin") return false;
  const autres = await User.countDocuments({
    role: "super_admin",
    statut: "actif",
    _id: { $ne: cible._id },
  });
  return autres === 0;
};

const fermerSessions = (utilisateurId) =>
  Session.updateMany(
    { utilisateur: utilisateurId, active: true },
    { active: false },
  );

const journaliser = (req, action, details, severite = "WARNING") =>
  enregistrerLog({
    utilisateur: req.user.id,
    action,
    details,
    ip: req.ip,
    severite,
  });

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
      User.countDocuments({ role: { $in: ROLES_ADMIN } }),
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

// ---------- Gestion des administrateurs ----------

exports.getAdministrateurs = async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ROLES_ADMIN } })
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

exports.creerAdmin = async (req, res) => {
  try {
    const { nom, prenom, email, mot_de_passe } = req.body;
    const role = req.body.role || "admin";

    if (!nom || !prenom || !email || !mot_de_passe) {
      return res.status(400).json({
        message: "Nom, prénom, email et mot de passe sont obligatoires",
      });
    }
    if (!ROLES_ADMIN.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }
    if (!emailValide(email)) {
      return res.status(400).json({ message: MESSAGE_EMAIL });
    }
    if (!motDePasseValide(mot_de_passe)) {
      return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ message: "Cet email existe déjà" });
    }

    const admin = await User.create({
      nom,
      prenom,
      email,
      mot_de_passe: await bcrypt.hash(mot_de_passe, 10),
      role,
    });

    await journaliser(
      req,
      "Création utilisateur",
      `Nouvel ${role} créé : ${admin.email}`,
      "INFO",
    );
    res.status(201).json(formatAdmin(admin));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.designerAdmin = async (req, res) => {
  try {
    const { erreur, cible } = await chargerUtilisateur(req.params.id);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    if (ROLES_ADMIN.includes(cible.role)) {
      return res
        .status(400)
        .json({ message: "Cet utilisateur est déjà administrateur" });
    }

    const role = req.body.role || "admin";
    if (!ROLES_ADMIN.includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    const ancienRole = cible.role;
    cible.role = role;
    await cible.save();
    await fermerSessions(cible._id);

    await journaliser(
      req,
      "Désignation administrateur",
      `${cible.email} : ${ancienRole} -> ${role}`,
    );
    res.status(200).json(formatAdmin(cible));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.revoquerAdmin = async (req, res) => {
  try {
    const { erreur, cible } = await chargerAdmin(req.params.id);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    if (String(cible._id) === String(req.user.id)) {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez pas modifier votre propre rôle" });
    }
    if (await estDernierSuperAdmin(cible)) {
      return res
        .status(400)
        .json({ message: "Impossible de retirer le dernier super admin" });
    }

    const role = req.body.role;
    if (!ROLES_ORDINAIRES.includes(role)) {
      return res.status(400).json({
        message:
          "Nouveau rôle obligatoire : enseignant, etudiant ou entreprise",
      });
    }

    const ancienRole = cible.role;
    cible.role = role;
    await cible.save();
    await fermerSessions(cible._id);

    await journaliser(
      req,
      "Retrait des droits admin",
      `${cible.email} : ${ancienRole} -> ${role}`,
    );
    res.status(200).json(formatAdmin(cible));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.changerStatutAdmin = async (req, res) => {
  try {
    const { erreur, cible } = await chargerAdmin(req.params.id);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const { statut } = req.body;
    if (!["actif", "inactif"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    if (statut === "inactif") {
      if (String(cible._id) === String(req.user.id)) {
        return res
          .status(400)
          .json({
            message: "Vous ne pouvez pas désactiver votre propre compte",
          });
      }
      if (await estDernierSuperAdmin(cible)) {
        return res
          .status(400)
          .json({ message: "Impossible de désactiver le dernier super admin" });
      }
    }

    cible.statut = statut;
    await cible.save();
    if (statut === "inactif") await fermerSessions(cible._id);

    await journaliser(
      req,
      statut === "inactif"
        ? "Désactivation administrateur"
        : "Réactivation administrateur",
      cible.email,
    );
    res.status(200).json(formatAdmin(cible));
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.reinitialiserMotDePasse = async (req, res) => {
  try {
    const { erreur, cible } = await chargerAdmin(req.params.id);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    const { mot_de_passe } = req.body;
    if (!mot_de_passe || !motDePasseValide(mot_de_passe)) {
      return res.status(400).json({ message: MESSAGE_MOT_DE_PASSE });
    }

    cible.mot_de_passe = await bcrypt.hash(mot_de_passe, 10);
    await cible.save();
    await fermerSessions(cible._id);

    await journaliser(req, "Réinitialisation mot de passe", cible.email);
    res.status(200).json({ message: "Mot de passe réinitialisé" });
  } catch (error) {
    gererErreur(error, res);
  }
};

exports.supprimerAdmin = async (req, res) => {
  try {
    const { erreur, cible } = await chargerAdmin(req.params.id);
    if (erreur)
      return res.status(erreur.status).json({ message: erreur.message });

    if (String(cible._id) === String(req.user.id)) {
      return res
        .status(400)
        .json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    }
    if (await estDernierSuperAdmin(cible)) {
      return res
        .status(400)
        .json({ message: "Impossible de supprimer le dernier super admin" });
    }

    await fermerSessions(cible._id);
    await cible.deleteOne();

    await journaliser(req, "Suppression administrateur", cible.email);
    res.status(200).json({ message: "Administrateur supprimé" });
  } catch (error) {
    gererErreur(error, res);
  }
};

// ---------- Journal, sessions, sécurité ----------

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

// ---------- Configuration ----------

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
