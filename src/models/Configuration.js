const mongoose = require("mongoose");

const configurationSchema = new mongoose.Schema(
  {
    cle: {
      type: String,
      default: "global",
      unique: true,
    },

    mode_maintenance: { type: Boolean, default: false },
    inscriptions_ouvertes: { type: Boolean, default: true },
    sauvegarde_auto: { type: Boolean, default: true },
    double_facteur_obligatoire: { type: Boolean, default: false },
    rate_limiting: { type: Boolean, default: true },
    notifications_email: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Configuration", configurationSchema);
