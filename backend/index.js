const express = require("express");
const path = require("path");
const mymongo = require("./scripts/mongo.js");
const cors = require("cors");

const app = express();

// Middleware per gestire JSON e CORS
app.use(express.json());
app.use(cors());

// Credenziali fornite
const mongoCredentials = {
  user: "site252620",
  pwd: "Oht2Ieyi",
  site: "mongo_site252620",
};

/* --- SERVIZIO FILE STATICI --- */

// 1. Serve il Marketplace (JS/HTML/CSS puro)
// Accessibile a: http://localhost:8000/marketplace/
app.use("/marketplace", express.static(path.join(__dirname, "../marketplace")));

// 2. Serve i dati di configurazione e immagini (per la genericità)
// Accessibile a: http://localhost:8000/data/config.json
app.use("/data", express.static(path.join(__dirname, "public/data")));
app.use("/img", express.static(path.join(__dirname, "public/img")));

// 3. Serve il Navigator (React build)
// Nota: 'dist' deve essere dentro la cartella 'backend' dopo il build
app.use(express.static(path.join(__dirname, "dist")));

/* --- API --- */

// Inizializzazione DB
app.get("/db/create", async (req, res) => {
  const result = await mymongo.create(mongoCredentials);
  res.send(result);
});

// Ricerca per Navigator e Marketplace
app.get("/db/search", async (req, res) => {
  const result = await mymongo.search(req.query, mongoCredentials);
  res.json(result);
});

/* --- GESTIONE ROUTING REACT --- */

// Questa rotta deve stare per ultima: se non trova un'API o un file statico,
// rimanda all'index.html di React (necessario per il Navigator)
app.get("*", (req, res) => {
  // Se la richiesta NON inizia con /db e NON inizia con /marketplace
  // allora mandiamo il file di React (Navigator)
  if (!req.url.startsWith("/db") && !req.url.startsWith("/marketplace")) {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  } else {
    // Se cercava qualcosa in marketplace o db che non esiste, mandiamo un 404 standard
    res.status(404).send("Risorsa non trovata nel Marketplace o nel Database");
  }
});
