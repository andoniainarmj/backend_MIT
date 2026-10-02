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


const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/formations", formationRoutes);
app.use("/api/entreprises", entrepriseRoutes);
app.use("/api/messages", messageContactRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/inscriptions", inscriptionRoutes);
app.use("/api/candidatures", candidatureRoutes);
app.use("/api/offres", offreAlternanceRoutes);


app.get("/", (req, res) => {
    res.json({
        message: "API Backend fonctionne"
    });
});

module.exports = app;