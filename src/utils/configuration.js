const Configuration = require("../models/Configuration");

const obtenirConfig = () =>
  Configuration.findOneAndUpdate(
    { cle: "global" },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

module.exports = { obtenirConfig };
