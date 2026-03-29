const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");

const mymongo = require("./scripts/mongo.js");
const apiRouter = require("./routes/api");
const app = express();

global.rootDir = process.cwd();

const mongoCredentials = {
  user: "site252620",
  pwd: "Oht2Ieyi",
  site: "mongo_site252620",
};

const isGocker =
  process.env.USER === "site252620" || process.cwd().includes("site252620");

let mongoURI;

if (isGocker) {
  mongoURI =
    "mongodb://site252620:Oht2Ieyi@localhost:27017/site252620?authSource=admin";
  console.log("Configurazione: GOKER/SSH");
} else {
  mongoURI =
    "mongodb+srv://dbArtAround2526:MIeXFqS2A9P8npk5@cluster0.xsxp2c3.mongodb.net/test?retryWrites=true&w=majority";
  console.log("Configurazione: LOCALE/CASA");
}

if (mongoose.connection.readyState === 0) {
  mongoose
    .connect(mongoURI)
    .then(() => {
      console.log(`✅ Mongoose connesso`);
    })
    .catch((err) => {
      console.error("❌ Errore connessione Mongoose:", err.message);
    });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. ROTTE API (Sempre per prime)
app.use("/api", apiRouter);

app.get("/api/config", (req, res) => {
  res.sendFile(path.join(__dirname, "config.json"));
});

app.get("/db/create", async function (req, res) {
  res.send(await mymongo.create(mongoCredentials));
});

// 2. MOBILE APP (navigator/dist)
const navigatorDistPath = path.join(__dirname, "navigator", "dist");
const navigatorSourcePath = path.join(__dirname, "navigator");
const navigatorPublicAudioPath = path.join(
  __dirname,
  "navigator",
  "public",
  "audio",
);

// Audio sempre disponibile anche se "dist" non esiste (ambiente dev)
app.use("/mobile/audio", express.static(navigatorPublicAudioPath));

// Build frontend (produzione)
app.use("/mobile", express.static(path.join(__dirname, "navigator", "dist")));

// Gestione del refresh per la Single Page Application (Mobile)
// Con Express/router recenti, usiamo una regex invece di "/mobile*"
app.use("/mobile", express.static(navigatorSourcePath));
app.get(/^\/mobile(?:\/.*)?$/, (req, res) => {
  const distIndexPath = path.join(navigatorDistPath, "index.html");
  const sourceIndexPath = path.join(navigatorSourcePath, "index.html");

  if (fs.existsSync(distIndexPath)) {
    return res.sendFile(distIndexPath);
  }

  if (fs.existsSync(sourceIndexPath)) {
    return res.sendFile(sourceIndexPath);
  }

  return res.status(404).send("Mobile app non trovata: build mancante.");
});

// 3. MARKETPLACE (Radice del sito)
// AGGIUNTO: 'extensions' permette di navigare su /gallery invece di /gallery.html
app.use(
  "/",
  express.static(path.join(__dirname, "marketplace"), {
    extensions: ["html", "htm"],
  }),
);

// Fallback per la home del marketplace se non trova index.html automaticamente
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "marketplace", "index.html"));
});

// 4. GESTIONE ERRORE 404 (Se nessuna delle precedenti funziona)
app.use((req, res) => {
  res
    .status(404)
    .send(
      "<h1>404 - Pagina non trovata</h1><p>Controlla l'indirizzo inserito.</p>",
    );
});

// 5. AVVIO SERVER
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto su http://localhost:${PORT}`);
});
