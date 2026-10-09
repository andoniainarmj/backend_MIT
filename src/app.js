const express = require("express");
const cors = require("cors");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const formationRoutes = require("./routes/formationRoutes");
const entrepriseRoutes = require("./routes/entrepriseRoutes");
const messageContactRoutes = require("./routes/messageContactRoutes");
const documentRoutes = require("./routes/documentRoutes");
const offreAlternanceRoutes = require("./routes/offreAlternanceRoutes");
const inscriptionRoutes = require("./routes/inscriptionRoutes");
const candidatureRoutes = require("./routes/candidatureRoutes");
const coursRoutes = require("./routes/coursRoutes");
const salleRoutes = require("./routes/salleRoutes");
const absenceRoutes = require("./routes/absenceRoutes");
const noteRoutes = require("./routes/noteRoutes");
const conventionRoutes = require("./routes/conventionRoutes");
const paiementRoutes = require("./routes/paiementRoutes");
const depenseRoutes = require("./routes/depenseRoutes");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/users", userRoutes);
app.use("/api/formations", formationRoutes);
app.use("/api/entreprises", entrepriseRoutes);
app.use("/api/messages", messageContactRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/inscriptions", inscriptionRoutes);
app.use("/api/candidatures", candidatureRoutes);
app.use("/api/offres", offreAlternanceRoutes);
app.use("/api/cours", coursRoutes);
app.use("/api/salles", salleRoutes);
app.use("/api/absences", absenceRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/conventions", conventionRoutes);
app.use("/api/paiements", paiementRoutes);
app.use("/api/depenses", depenseRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "API Backend fonctionne",
  });
});

module.exports = app;
