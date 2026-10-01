const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const formationRoutes = require("./routes/formationRoutes");
const entrepriseRoutes = require("./routes/entrepriseRoutes");
const messageContactRoutes = require("./routes/messageContactRoutes");
const documentRoutes = require("./routes/documentRoutes");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/formations", formationRoutes);
app.use("/api/entreprises", entrepriseRoutes);
app.use("/api/messages", messageContactRoutes);
app.use("/api/documents", documentRoutes);


app.get("/", (req, res) => {
    res.json({
        message: "API Backend fonctionne"
    });
});

module.exports = app;