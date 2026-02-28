const express = require("express");
const path = require("path");
const mymongo = require("./scripts/mongo.js");
const cors = require("cors");

const app = express();

// Middleware per gestire JSON e CORS
app.use(express.json());
app.use(cors());

// LOGICA AMBIENTE: Riconosce se sei sul tuo PC o sul server universitario
const isRemote =
  process.env.NODE_ENV === "production" || process.cwd().includes("site252620");

const mongoCredentials = isRemote
  ? {
      // Credenziali per GOCKER (Remoto)
      user: "site252620",
      pwd: "Oht2Ieyi",
      site: "mongo_site252620",
      url: `mongodb://site252620:Oht2Ieyi@mongo_site252620:27017`,
    }
  : {
      // Credenziali per DOCKER LOCAL (Tuo PC)
      user: "",
      pwd: "",
      site: "localhost",
      // RIMUOVI user:pwd se sono vuoti per il locale
      url: "mongodb://127.0.0.1:27017",
    };

// Seleziona la porta corretta: 8888 per Uni, 8000 per Locale
const PORT = isRemote ? 8888 : 8000;

/* --- SERVIZIO FILE STATICI --- */

app.use("/marketplace", express.static(path.join(__dirname, "../marketplace")));
app.use("/data", express.static(path.join(__dirname, "public/data")));
app.use("/img", express.static(path.join(__dirname, "public/img")));
app.use(express.static(path.join(__dirname, "dist")));

/* --- API PER IL DATABASE --- */

app.get("/db/create", async (req, res) => {
  const result = await mymongo.create(mongoCredentials);
  res.send(result);
});

app.get("/db/search", async (req, res) => {
  const result = await mymongo.search(req.query, mongoCredentials);
  res.json(result);
});

/* --- GESTIONE ROUTING REACT (NAVIGATOR) --- */

app.get("*", (req, res) => {
  if (!req.url.startsWith("/db") && !req.url.startsWith("/marketplace")) {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  } else {
    res.status(404).send("Risorsa non trovata");
  }
});

/* --- AVVIO SERVER E AUTO-POPULATE --- */

// rimosso il doppione "const PORT = 8000" che avevi qui
app.listen(PORT, async () => {
  console.log("------------------------------------------");
  console.log(`AMBIENTE: ${isRemote ? "REMOTO (Uni)" : "LOCALE (Docker)"}`);
  console.log(`Server ArtAround attivo su porta ${PORT}`);

  try {
    console.log("Verifica e popolamento automatico del database in corso...");
    const result = await mymongo.create(mongoCredentials);
    console.log("Risultato DB:", result);
  } catch (err) {
    console.error("Errore durante l'auto-popolamento:", err);
  }

  // Se siamo in locale mostra i link cliccabili
  if (!isRemote) {
    console.log(`Navigator: http://localhost:${PORT}`);
    console.log(`Marketplace: http://localhost:${PORT}/marketplace/index.html`);
  }
  console.log("------------------------------------------");
});
