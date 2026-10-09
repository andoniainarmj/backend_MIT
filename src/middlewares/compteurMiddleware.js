const CompteurRequetes = require("../models/CompteurRequetes");

const compterRequetes = (req, res, next) => {
  const jour = new Date().toISOString().slice(0, 10);
  CompteurRequetes.updateOne(
    { jour },
    { $inc: { total: 1 } },
    { upsert: true },
  ).catch(() => {});
  next();
};

module.exports = { compterRequetes };
