const mongoose = require("mongoose");

const compteurRequetesSchema = new mongoose.Schema({
  jour: {
    type: String,
    required: true,
    unique: true,
  },

  total: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("CompteurRequetes", compteurRequetesSchema);
