const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");

const mymongo = require("./scripts/mongo.js");
const apiRouter = require("./routes/api");
const app = express();
app.use(express.static(path.join(__dirname, "public")));

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

// In index.js hai già questo, assicurati che il file config.json esista:
app.get("/api/config", (req, res) => {
  const configPath = path.join(__dirname, "config.json");
  if (fs.existsSync(configPath)) {
    res.sendFile(configPath);
  } else {
    res.status(404).json({ errore: "Configurazione museo non trovata" });
  }
});

const say = require("say");

// Rotta TTS con la libreria "say"
app.get("/api/tts", (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).send("Missing text parameter");

  // Esporta temporaneamente l'audio in un file wav e lo spedisce al client
  const tempFilePath = path.join(__dirname, "temp_audio.wav");

  // Su Windows puoi usare voci come "Cosimo" o "Elsa" se installate,
  // oppure lasciarlo nullo per usare la voce italiana di default del sistema.
  say.export(text, null, 1.0, tempFilePath, (err) => {
    if (err) {
      console.error("Errore Say TTS:", err);
      return res.status(500).send("Errore generazione audio");
    }

    // Inviamo il file generato al frontend e lo cancelliamo subito dopo l'invio
    res.sendFile(tempFilePath, () => {
      fs.unlinkSync(tempFilePath);
    });
  });
});

app.get("/db/create", async function (req, res) {
  res.send(await mymongo.create(mongoCredentials));
});

// 2. MOBILE APP (navigator/dist)
const navigatorDistPath = path.join(__dirname, "navigator", "dist");
const navigatorSourcePath = path.join(__dirname, "navigator");

app.use(
  "/navigator/audio",
  express.static(path.join(navigatorSourcePath, "public", "audio")),
);
app.use(
  "/navigator/img",
  express.static(path.join(navigatorSourcePath, "public", "img")),
);

app.use("/navigator", express.static(navigatorDistPath));

app.get(/^\/navigator(?:\/.*)?$/, (req, res) => {
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
