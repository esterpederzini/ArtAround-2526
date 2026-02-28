const express = require("express");
const cors = require("cors");
const path = require("path");
const mymongo = require("./scripts/mongo.js");

let app = express();

/* CONFIGURAZIONE */
app.use(express.static(path.resolve(__dirname, "dist"))); // Serve il build di React
app.use(express.json()); // Fondamentale per ricevere dati dalle API
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.enable("trust proxy");

/* CREDENZIALI (Usa le tue) */
const mongoCredentials = {
  user: "site252620",
  pwd: "Oht2Ieyi",
  site: "mongo_site252620",
};

/* API: CREAZIONE DATI (Seeding) */
app.get("/db/create", async function (req, res) {
  const result = await mymongo.create(mongoCredentials);
  res.send(result);
});

/* API: RICERCA (Usata da Navigator e Marketplace) */
app.get("/db/search", async function (req, res) {
  // Questa è l'API che restituirà i JSON al tuo React
  const result = await mymongo.search(req.query, mongoCredentials);
  res.json(result);
});

/* serve static marketplace files (vanilla SPA) */
// adjust the path if you moved the marketplace directory elsewhere
app.use(
  "/marketplace",
  express.static(path.resolve(__dirname, "../src/marketplace/Prova3/public")),
);

/* GESTIONE FRONTEND (REACT ROUTING) */
app.get("*", (req, res) => {
  // Questo assicura che React gestisca le sue rotte interne
  res.sendFile(path.resolve(__dirname, "dist", "index.html"));
});

app.listen(8000, function () {
  console.log(`Server ArtAround attivo sulla porta 8000`);
});
