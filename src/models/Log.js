const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
  {
    utilisateur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    email_tente: {
      type: String,
      trim: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    details: {
      type: String,
      trim: true,
    },

    ip: {
      type: String,
      trim: true,
    },

    severite: {
      type: String,
      default: "INFO",
      enum: ["INFO", "WARNING", "ERROR"],
    },
  },
  {
    timestamps: true,
  },
);

logSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Log", logSchema);
