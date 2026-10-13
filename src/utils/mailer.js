const nodemailer = require("nodemailer");
const { obtenirConfig } = require("./configuration");

let transporteur = null;

const smtpConfigure = () =>
  Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );

const obtenirTransporteur = () => {
  if (!transporteur) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    transporteur = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporteur;
};

const nettoyer = (texte) =>
  String(texte || "")
    .replace(/[\r\n]+/g, " ")
    .trim();

const envoyerEmail = async ({ to, subject, text, replyTo }) => {
  try {
    const config = await obtenirConfig();
    if (!config.notifications_email) {
      return { envoye: false, raison: "Notifications e-mail désactivées" };
    }
    if (!smtpConfigure()) {
      return { envoye: false, raison: "Envoi d'e-mail non configuré" };
    }

    await obtenirTransporteur().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: nettoyer(subject),
      text,
      replyTo,
    });
    return { envoye: true };
  } catch (error) {
    console.error("Erreur envoi e-mail :", error.message);
    return { envoye: false, raison: "Échec de l'envoi" };
  }
};

module.exports = { envoyerEmail };
