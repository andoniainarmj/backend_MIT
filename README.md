# API Backend MIT-Madagascar

Backend Node.js / Express / MongoDB de la plateforme MIT-Madagascar (site public, espace étudiant, espace admin, espace super admin).

## Lancer le projet

```bash
git clone https://github.com/andoniainarmj/backend_MIT.git
cd backend_MIT
npm install
```

Créer un fichier `.env` à la racine, d'après `.env.example` :

```
MONGO_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=1d
SMTP_HOST=...
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="MIT Madagascar <adresse@exemple.com>"
MAIL_CONTACT=...
```

Les variables `SMTP_*`, `MAIL_FROM` et `MAIL_CONTACT` servent à l'envoi des e-mails (formulaire de contact). Si elles sont vides, tout fonctionne sauf l'envoi des e-mails. Avec Gmail, `SMTP_PASS` est un « mot de passe d'application » (validation en deux étapes requise), pas le mot de passe du compte. `MAIL_CONTACT` est l'adresse qui reçoit les messages de contact.

Puis :

```bash
npm start
```

**Scripts utiles**

| Commande                                                 | Rôle                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `node src/scripts/createAdmin.js email motdepasse admin` | Créer un admin (ou `super_admin` en 3e argument)                         |
| `node src/scripts/seed.js`                               | Créer les données de départ (formations, salles, cours, comptes de démo) |

Comptes de démonstration créés par `seed.js` (mot de passe `Demo12345`) : `prof1@mit.com`, `prof2@mit.com`, `etudiant1@mit.com`, `etudiant2@mit.com`.

## Règles générales

- **URL de base :** `http://localhost:PORT`
- **Format :** JSON, sauf les routes avec fichier (`multipart/form-data`).
- **Authentification :** `POST /api/users/login` renvoie un `token`. Pour les routes protégées, envoyer l'en-tête `Authorization: Bearer <token>`.
- **Sessions :** chaque connexion crée une session. Si un compte est désactivé, supprimé, change de rôle ou est déconnecté par le super admin, son token est refusé (401) et il doit se reconnecter.
- **Rôles :** `super_admin`, `admin`, `enseignant`, `etudiant`, `entreprise`. Le `super_admin` a accès à toutes les routes réservées à l'admin.
- **Mot de passe :** 8 caractères minimum, avec au moins une lettre et un chiffre.
- **Fichiers :** formats `jpg`, `jpeg`, `png`, `webp`, `pdf`, `doc`, `docx`, 5 Mo maximum. Un fichier envoyé est accessible via `http://localhost:PORT/uploads/nom-du-fichier`. Le chemin est renvoyé dans le champ du document (`image`, `logo`, `fichier`, `cv`, `photo`).
- **Dates :** format ISO, par exemple `2026-10-05T08:30:00`.
- **Maintenance :** si le mode maintenance est actif, tout le monde sauf le super admin reçoit 503.
- **CORS :** autorisé pour `http://localhost:5173`. Si le frontend utilise un autre port, le dire au backend.

**Codes de retour**

| Code      | Signification                                                                     |
| --------- | --------------------------------------------------------------------------------- |
| 200 / 201 | Succès / créé                                                                     |
| 400       | Données invalides (champ manquant, id mal formé, format)                          |
| 401       | Token manquant, invalide, expiré ou session révoquée                              |
| 403       | Accès refusé pour ce rôle                                                         |
| 404       | Élément introuvable                                                               |
| 409       | Doublon ou conflit d'horaire                                                      |
| 429       | Trop de messages de contact envoyés avec la même adresse e-mail                   |
| 503       | Plateforme en maintenance, ou e-mail non envoyé (réponse à un message de contact) |

Les erreurs ont toujours le format `{ "message": "..." }`.

---

## Routes

Légende des accès : **public** = sans token, **connecté** = tout utilisateur avec token, sinon liste des rôles.

### Utilisateurs `/api/users`

| Méthode | Route       | Accès    | Détails                                                                                                                                                                     |
| ------- | ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/register` | public   | `nom, prenom, email, mot_de_passe, role` (`etudiant` ou `entreprise` uniquement). Inscriptions fermables par le super admin.                                                |
| POST    | `/login`    | public   | `email, mot_de_passe`. Renvoie `token` et `user`.                                                                                                                           |
| GET     | `/me`       | connecté | Profil de l'utilisateur connecté                                                                                                                                            |
| PUT     | `/me`       | connecté | `multipart` : `nom, prenom, email, mot_de_passe, telephone, adresse, date_naissance`, fichier `photo`                                                                       |
| POST    | `/`         | admin    | Créer un utilisateur : `nom, prenom, email, mot_de_passe, role`. Créer un admin : super admin uniquement.                                                                   |
| GET     | `/`         | admin    | Filtres : `?role=etudiant&statut=actif&formation=ID`                                                                                                                        |
| GET     | `/:id`      | admin    |                                                                                                                                                                             |
| PUT     | `/:id`      | admin    | Mêmes champs que `/me`, plus `statut`, `role`, `formation`, `niveau`, `specialite`, `type_contrat` (`temps_plein` ou `vacataire`). Gérer un admin : super admin uniquement. |
| DELETE  | `/:id`      | admin    | Supprimer un admin : super admin uniquement.                                                                                                                                |

Un étudiant reçoit automatiquement un `numero_etudiant` (`MIT-2026-0001`).

### Formations `/api/formations`

| Méthode                         | Route         | Accès  |
| ------------------------------- | ------------- | ------ |
| GET                             | `/` et `/:id` | public |
| POST, PUT `/:id`, DELETE `/:id` |               | admin  |

Champs (`multipart`) : `titre, description, duree, niveau, categorie` (ex. « Bachelors (Bac+3) »), `rythme`, fichier `image`.

### Entreprises `/api/entreprises`

| Méthode                         | Route         | Accès  |
| ------------------------------- | ------------- | ------ |
| GET                             | `/` et `/:id` | public |
| POST, PUT `/:id`, DELETE `/:id` |               | admin  |

Champs (`multipart`) : `nom, secteur_activite, adresse`, fichier `logo`.

### Offres d'alternance `/api/offres`

| Méthode                         | Route         | Accès             |
| ------------------------------- | ------------- | ----------------- |
| GET                             | `/` et `/:id` | public            |
| POST, PUT `/:id`, DELETE `/:id` |               | admin, entreprise |

Champs (JSON) : `titre, description, entreprise` (id), `statut` (`ouverte` ou `fermee`).

### Messages de contact `/api/messages`

| Méthode | Route           | Accès  | Détails                                                                                                                                                                                                                                |
| ------- | --------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST    | `/`             | public | `nom, email, sujet, message` obligatoires. Facultatifs : `prenom, telephone, entreprise`. Sert au formulaire de contact et au formulaire « Recrutez nos talents ». Renvoie `{ "message": "Message envoyé avec succès", "id": "..." }`. |
| GET     | `/`             | admin  | Filtre `?statut=non_lu`. Chaque message contient aussi sa réponse éventuelle (`reponse`, `date_reponse`, `repondu_par`).                                                                                                               |
| GET     | `/:id`          | admin  |                                                                                                                                                                                                                                        |
| POST    | `/:id/repondre` | admin  | `{ "reponse": "Bonjour, ..." }`. Envoie la réponse par e-mail à l'expéditeur, passe le message en `traite` et conserve la réponse. 503 si l'e-mail n'a pas pu partir (le message reste inchangé).                                      |
| PUT     | `/:id`          | admin  | `statut` : `non_lu`, `lu`, `traite`                                                                                                                                                                                                    |
| DELETE  | `/:id`          | admin  |                                                                                                                                                                                                                                        |

**E-mails du formulaire de contact :** à chaque message, un e-mail est envoyé à l'adresse `MAIL_CONTACT` (en « répondre à » l'expéditeur) et une confirmation de réception est envoyée à l'expéditeur. Si l'envoi échoue, le message est quand même enregistré. Limite anti-spam : 5 messages par heure et par adresse e-mail (429 au-delà). L'objet est limité à 200 caractères et le message à 5000.

### Documents `/api/documents`

| Méthode | Route            | Accès                       | Détails                                                                                                                                                                                           |
| ------- | ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/`              | public                      | Documents publics (page Documentation). Filtre `?categorie=`                                                                                                                                      |
| GET     | `/mes-documents` | connecté                    | Documents personnels + ceux de sa formation. Renvoie aussi `stockage` (utilisé sur 5 Go) et `par_categorie`. Filtre `?categorie=`                                                                 |
| GET     | `/tous`          | admin                       | Filtres : `formation, visibilite, categorie, proprietaire`                                                                                                                                        |
| GET     | `/:id`           | connecté                    | Selon la visibilité                                                                                                                                                                               |
| POST    | `/`              | admin, enseignant, etudiant | `multipart` : `titre, type, categorie`, fichier `fichier`. Admin : aussi `visibilite` (`public`, `formation`, `prive`) et `formation`. Un étudiant ou enseignant crée toujours un document privé. |
| PUT     | `/:id`           | propriétaire ou admin       |                                                                                                                                                                                                   |
| DELETE  | `/:id`           | propriétaire ou admin       |                                                                                                                                                                                                   |

### Inscriptions aux formations `/api/inscriptions`

| Méthode | Route               | Accès           | Détails                                                                                                          |
| ------- | ------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------- |
| POST    | `/`                 | etudiant, admin | `{ "formation": "ID" }`. L'utilisateur vient du token (l'admin peut envoyer `utilisateur`). 409 si déjà inscrit. |
| GET     | `/mes-inscriptions` | etudiant        |                                                                                                                  |
| GET     | `/`                 | admin           |                                                                                                                  |
| GET     | `/:id`              | connecté        |                                                                                                                  |
| PUT     | `/:id`              | admin           | `statut` : `en_attente`, `validee`, `annulee`                                                                    |
| DELETE  | `/:id`              | admin           |                                                                                                                  |

### Candidatures `/api/candidatures`

| Méthode | Route               | Accès             | Détails                                                         |
| ------- | ------------------- | ----------------- | --------------------------------------------------------------- |
| POST    | `/`                 | etudiant, admin   | `multipart` : `offre` (id), fichier `cv`. 409 si déjà candidat. |
| GET     | `/mes-candidatures` | etudiant          |                                                                 |
| GET     | `/`                 | admin, entreprise |                                                                 |
| GET     | `/:id`              | connecté          |                                                                 |
| PUT     | `/:id`              | admin, entreprise | `statut` : `en_attente`, `acceptee`, `refusee`                  |
| DELETE  | `/:id`              | admin             |                                                                 |

### Cours `/api/cours`

| Méthode                         | Route  | Accès    | Détails                                             |
| ------------------------------- | ------ | -------- | --------------------------------------------------- |
| GET                             | `/`    | connecté | Filtres : `formation, niveau, semestre, enseignant` |
| GET                             | `/:id` | connecté |                                                     |
| POST, PUT `/:id`, DELETE `/:id` |        | admin    |                                                     |

Champs : `titre, formation` (id), `niveau, semestre, ects` obligatoires. Facultatifs : `code, description, enseignant` (id), `coefficient` (1 par défaut), `heures_semaine`.

### Salles `/api/salles`

| Méthode                         | Route                            | Accès    | Détails                                                                                      |
| ------------------------------- | -------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| GET                             | `/` et `/:id`                    | connecté |                                                                                              |
| GET                             | `/disponibles?debut=...&fin=...` | connecté | Salles libres sur un créneau                                                                 |
| POST, PUT `/:id`, DELETE `/:id` |                                  | admin    | `nom, capacite`, `type` (`cours_theorique`, `labo`, `amphi`, `autre`), `equipements` (liste) |

### Emploi du temps `/api/seances`

| Méthode | Route           | Accès                | Détails                                                                                                                                                                                                                                                                             |
| ------- | --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/mon-planning` | etudiant, enseignant | Étudiant : planning de sa formation et de son niveau. Enseignant : ses séances. Filtres `?du=&au=`. Séances publiées uniquement.                                                                                                                                                    |
| GET     | `/`             | connecté             | Filtres : `formation, niveau, enseignant, salle, cours, du, au`. Les non-admins ne voient que les séances publiées.                                                                                                                                                                 |
| GET     | `/:id`          | connecté             |                                                                                                                                                                                                                                                                                     |
| POST    | `/`             | admin                | `{ "cours": "ID", "salle": "ID", "debut": "...", "fin": "...", "type": "cours" }`. L'enseignant, la formation et le niveau viennent du cours. Types : `cours, tp, projet, examen, autre`. **409** avec la liste `conflits` si la salle, l'enseignant ou la promotion est déjà pris. |
| PUT     | `/:id`          | admin                | Mêmes règles de conflit                                                                                                                                                                                                                                                             |
| PUT     | `/publier`      | admin                | `{ "formation": "ID", "niveau": "L2", "du": "...", "au": "...", "publiee": true }`                                                                                                                                                                                                  |
| DELETE  | `/:id`          | admin                |                                                                                                                                                                                                                                                                                     |

Une séance reste invisible aux étudiants et enseignants tant qu'elle n'est pas publiée.

### Absences `/api/absences`

| Méthode | Route           | Accès             | Détails                                                               |
| ------- | --------------- | ----------------- | --------------------------------------------------------------------- |
| GET     | `/mes-absences` | etudiant          | `justifiees`, `non_justifiees` et la liste                            |
| POST    | `/`             | admin, enseignant | `{ "etudiant": "ID", "seance": "ID", "date": "...", "motif": "..." }` |
| GET     | `/` et `/:id`   | admin, enseignant | Filtres : `?etudiant=ID&justifiee=true`                               |
| PUT     | `/:id`          | admin             | `justifiee`, `motif`                                                  |
| DELETE  | `/:id`          | admin             |                                                                       |

### Notes `/api/notes`

Pondération : CC1 20 %, CC2 30 %, Examen 50 %. La moyenne est calculée par l'API.

| Méthode | Route             | Accès             | Détails                                                                                                                                                                                                    |
| ------- | ----------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/mes-notes`      | etudiant          | Notes **validées** par matière (CC1, CC2, examen, moyenne, coefficient, ECTS, statut), moyenne générale, mention, rang, ECTS validés. Filtre `?semestre=S4`. Le profil doit avoir `formation` et `niveau`. |
| GET     | `/cours/:coursId` | admin, enseignant | Tous les étudiants de la promotion avec leurs notes, plus les statistiques (moyenne de classe, taux de réussite, distribution). Un enseignant n'accède qu'à ses cours.                                     |
| POST    | `/saisie`         | admin, enseignant | `{ "cours": "ID", "notes": [{ "etudiant": "ID", "cc1": 14.5, "cc2": 15, "examen": 16 }] }`. Notes de 0 à 20, une valeur absente est ignorée, `null` efface.                                                |
| PUT     | `/valider`        | admin             | `{ "cours": "ID", "validee": true }`. Les étudiants ne voient que les notes validées.                                                                                                                      |
| DELETE  | `/:id`            | admin             |                                                                                                                                                                                                            |

### Conventions de stage `/api/conventions`

| Méthode     | Route              | Accès                | Détails                                                                                                                                     |
| ----------- | ------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| GET         | `/stats`           | admin                | Alternants placés, en recherche, conventions signées, entreprises partenaires                                                               |
| GET         | `/mes-conventions` | etudiant, enseignant | Étudiant : sa convention. Enseignant : celles dont il est tuteur.                                                                           |
| GET         | `/` et `/:id`      | admin                | Filtres : `etudiant, entreprise, statut, tuteur`                                                                                            |
| POST        | `/`                | admin                | `etudiant, entreprise, poste, date_debut, date_fin` obligatoires. Facultatifs : `type` (`alternance` ou `stage`), `tuteur` (id enseignant). |
| PUT, DELETE | `/:id`             | admin                | `statut` : `validation`, `active`, `terminee`, `annulee`                                                                                    |

### Finances `/api/paiements` et `/api/depenses`

| Méthode     | Route                          | Accès    | Détails                                                                                                                                            |
| ----------- | ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET         | `/api/paiements/mes-paiements` | etudiant | `total_paye`, `total_restant` et la liste                                                                                                          |
| GET         | `/api/paiements/stats`         | admin    | Recettes, dépenses, solde net, factures en attente et en retard, dépenses par département                                                          |
| GET         | `/api/paiements`               | admin    | Filtres : `?etudiant=ID&statut=en_retard`. Chaque ligne a un `statut_effectif` : `paye`, `en_attente` ou `en_retard` (calculé d'après l'échéance). |
| POST        | `/api/paiements`               | admin    | `{ "etudiant": "ID", "description": "Scolarité", "montant": 1200000, "echeance": "2026-11-01" }`                                                   |
| PUT         | `/api/paiements/:id/payer`     | admin    | Marque comme payé                                                                                                                                  |
| PUT, DELETE | `/api/paiements/:id`           | admin    |                                                                                                                                                    |
| GET, POST   | `/api/depenses`                | admin    | `libelle, montant, departement, date`. Filtre `?departement=`                                                                                      |
| PUT, DELETE | `/api/depenses/:id`            | admin    |                                                                                                                                                    |

### Messagerie `/api/conversations`

Tous les accès sont réservés aux utilisateurs connectés. Il n'y a pas de temps réel : le frontend doit réinterroger l'API régulièrement.

| Méthode | Route                  | Détails                                                                                                                                                                                      |
| ------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/contacts`            | Chercher des personnes : `?q=nom&role=enseignant`                                                                                                                                            |
| GET     | `/`                    | Mes conversations avec le dernier message et `non_lus`                                                                                                                                       |
| POST    | `/`                    | Direct : `{ "participants": ["ID"] }`. Groupe : `{ "type": "groupe", "nom": "...", "participants": ["ID1", "ID2"] }` (3 personnes minimum). Une conversation directe existante est renvoyée. |
| GET     | `/non-lus`             | Total des messages non lus                                                                                                                                                                   |
| GET     | `/:id/messages`        | Les 50 derniers. Paramètres `?limite=` et `?avant=date`                                                                                                                                      |
| POST    | `/:id/messages`        | `{ "contenu": "..." }` (2000 caractères maximum)                                                                                                                                             |
| PUT     | `/:id/lu`              | Marquer la conversation comme lue                                                                                                                                                            |
| DELETE  | `/messages/:messageId` | Auteur ou admin                                                                                                                                                                              |

### Tableaux de bord `/api/dashboard`

| Méthode | Route       | Accès    | Contenu                                                                                                                                                                                                                                         |
| ------- | ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/etudiant` | etudiant | Moyenne générale, mention, évolution, ECTS, absences, prochain cours, emploi du temps de la semaine, notes récentes, documents récents, alternance, paiements restants, messages non lus                                                        |
| GET     | `/admin`    | admin    | Étudiants actifs, enseignants, formations, taux de réussite, taux de placement en alternance, dernières inscriptions, alertes (3 absences non justifiées ou plus, conventions en attente), candidatures en attente, messages de contact non lus |

Le tableau de bord du super admin est `GET /api/super-admin/vue-ensemble`.

### Super admin `/api/super-admin`

Toutes ces routes sont réservées au `super_admin`.

| Méthode | Route                               | Détails                                                                                                                                                                             |
| ------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET     | `/vue-ensemble`                     | État du serveur et de la base, utilisateurs actifs, administrateurs, sessions actives, logs et erreurs du jour, requêtes API du jour et des 7 derniers jours, 5 derniers événements |
| GET     | `/administrateurs`                  | Liste des admins avec leur dernière connexion                                                                                                                                       |
| POST    | `/administrateurs`                  | `nom, prenom, email, mot_de_passe`, `role` (`admin` par défaut, ou `super_admin`)                                                                                                   |
| PUT     | `/administrateurs/:id/designer`     | Faire d'un utilisateur existant un admin. `role` facultatif                                                                                                                         |
| PUT     | `/administrateurs/:id/revoquer`     | Retirer les droits : `{ "role": "enseignant" }` (ou `etudiant`, `entreprise`)                                                                                                       |
| PUT     | `/administrateurs/:id/statut`       | `{ "statut": "actif" }` ou `"inactif"`                                                                                                                                              |
| PUT     | `/administrateurs/:id/mot-de-passe` | `{ "mot_de_passe": "..." }`                                                                                                                                                         |
| DELETE  | `/administrateurs/:id`              | Supprimer un admin                                                                                                                                                                  |
| GET     | `/logs`                             | Journal d'activité : `?severite=ERROR&utilisateur=ID&action=...&du=&au=&page=1&limite=10`. Renvoie `total, page, pages, logs`.                                                      |
| GET     | `/logs/export`                      | Export CSV (à appeler avec le token, puis proposer le téléchargement)                                                                                                               |
| GET     | `/sessions`                         | Sessions actives (utilisateur, IP, appareil, dernière activité)                                                                                                                     |
| PUT     | `/sessions/:id/deconnecter`         | Fermer une session                                                                                                                                                                  |
| PUT     | `/sessions/deconnexion-globale`     | Fermer toutes les sessions (y compris la sienne)                                                                                                                                    |
| GET     | `/connexions-echouees`              | Échecs de connexion des dernières 24 h                                                                                                                                              |
| GET     | `/configuration`                    | Paramètres de la plateforme                                                                                                                                                         |
| PUT     | `/configuration`                    | Booléens : `mode_maintenance, inscriptions_ouvertes, sauvegarde_auto, double_facteur_obligatoire, rate_limiting, notifications_email`                                               |

**Garde-fous :** le super admin ne peut pas se retirer ses droits, se désactiver ni se supprimer. Le dernier super admin actif ne peut jamais être retiré, désactivé ni supprimé.

**Paramètres réellement appliqués :** `mode_maintenance`, `inscriptions_ouvertes` et `notifications_email` (désactivé, aucun e-mail n'est envoyé). Les trois autres (`sauvegarde_auto`, `double_facteur_obligatoire`, `rate_limiting`) sont enregistrés mais n'ont pas encore d'effet.

## Limites connues

- Pas de temps réel pour la messagerie.
- Pas de vraie double authentification, de sauvegarde automatique ni de limitation générale des requêtes.
- Les e-mails ne sont envoyés que pour le formulaire de contact (confirmation, notification à l'école, réponse de l'admin).
- Pas de score de sécurité ni de pourcentage d'uptime (rien ne les mesure).
- Les comptes de démonstration créés par `seed.js` sont à supprimer avant une mise en ligne réelle.
