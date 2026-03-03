const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

// 1. IMPORTA GLI SCRIPT DEL PROFESSOR VITALI
const mymongo = require("./scripts/mongo.js");
const app = express();

// Globali richieste dagli script di default
global.rootDir = process.cwd();

// 2. CREDENZIALI GOCKER (Inserisci quelle del tuo account)
const mongoCredentials = {
  user: "site252620",
  pwd: "Oht2Ieyi",
  site: "mongo_site252620",
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. GESTIONE CONFIG E DATABASE
app.get("/api/config", (req, res) => {
  // Usa __dirname per essere sicuri di puntare alla cartella del progetto
  res.sendFile(path.join(__dirname, "config.json"));
});

app.get("/db/create", async function (req, res) {
  res.send(await mymongo.create(mongoCredentials));
});

app.get("/db/search", async function (req, res) {
  // Gestisce sia query normali che AJAX dal tuo React
  res.send(await mymongo.search(req.query, mongoCredentials));
});

// 4. SERVIZIO FILE STATICI
// Marketplace (Vanilla JS) sulla root
app.use("/", express.static(path.join(__dirname, "marketplace")));

// Navigator (React Build) su /mobile
app.use("/mobile", express.static(path.join(__dirname, "navigator/dist")));

// Fallback per React Router (fondamentale per non avere 404 al refresh)
// Nota: NON ci sono le virgolette, ma le barre diagonali / /
app.get(/^\/mobile(?:\/.*)?$/, (req, res) => {
  res.sendFile(path.join(__dirname, "navigator/dist", "index.html"));
});

// 5. AVVIO SERVER
// Se esiste una porta del sistema usa quella, altrimenti usa la 8000 (locale)
const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  global.startDate = new Date();

  // DEFINIAMO la variabile baseURL (o base) qui dentro
  const isGocker =
    process.env.USER === "site252620" || process.cwd().includes("site252620");

  const baseURL = isGocker
    ? `https://site252620.tw.cs.unibo.it`
    : `http://localhost:${PORT}`;

  console.log(
    `🚀 Server ArtAround avviato il ${global.startDate.toLocaleString()}`,
  );
  console.log(`💻 Marketplace (PC): ${baseURL}/`);
  console.log(`📱 Navigator (Mobile): ${baseURL}/mobile`);
});
