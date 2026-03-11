/*
File: scripts/mongo.js
Descrizione: Popolamento DB per Gocker - Supporta Visite, Items e Utenti
*/

const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

let dbname = "artaround";

// --- 1. SCHEMI (Allineati ai tuoi dati reali) ---

const itemSchema = new mongoose.Schema({
  _id: String, // Usiamo l'ID testuale (es: it_ramesse_01)
  operaId: String,
  museo: String,
  titolo: String,
  descrizione: String,
  url: String,
  autore: String,
  lunghezza: String,
  linguaggio: String,
  profonditaContenuto: String,
  audioUrl: { type: String, default: "" },
});

const visitSchema = new mongoose.Schema({
  id: String,
  title: String,
  image: String,
  type: { type: String, default: "AUDIO GUIDE" },
  duration: String,
  stops: Number,
  museo: String,
  livello_base: String,
  info_generale: String,
  tappe: [
    {
      ordine: Number,
      operaId: String,
      logistica: String,
      item_default: { type: String, ref: "Item" },
      varianti_difficolta: {
        infantile: String,
        medio: String,
        avanzato: String,
      },
    },
  ],
});

// Schema Utenti per il Login
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  ruolo: String,
});

const Item = mongoose.models.Item || mongoose.model("Item", itemSchema);
const Visit = mongoose.models.Visit || mongoose.model("Visit", visitSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema);

const getUri = (credentials) => {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  return `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
};

// --- 2. FUNZIONE CREATE ---
exports.create = async (credentials) => {
  let debug = [];
  try {
    const mongouri = getUri(credentials);
    await mongoose.connect(mongouri);
    debug.push("✅ Connesso al DB");

    let seedPath = path.join(__dirname, "..", "seed_data.json");
    let doc = await fs.readFile(seedPath, "utf8");
    let fullData = JSON.parse(doc);

    // PULIZIA TOTALE
    await Item.deleteMany({});
    await Visit.deleteMany({});
    await User.deleteMany({});
    debug.push("🗑️ Database ripulito");

    // 1. INSERIMENTO UTENTI
    if (fullData.utenti) {
      await User.insertMany(fullData.utenti);
      debug.push(`👤 Inseriti ${fullData.utenti.length} utenti`);
    }

    // 2. INSERIMENTO ITEMS
    if (fullData.items) {
      await Item.insertMany(fullData.items);
      debug.push(`🖼️ Inseriti ${fullData.items.length} items`);
    }

    // 3. INSERIMENTO VISITE (Mappatura fedele ai tuoi dati)
    let visitsToInsert = fullData.visits.map((v) => ({
      id: v.id,
      title: v.title || v.titolo, // Accetta entrambi
      image: v.image || v.immagine, // Accetta entrambi
      museo: v.museo,
      livello_base: v.livello_base || v.difficolta_target, // Accetta entrambi
      info_generale: v.info_generale || v.descrizione_logistica, // Accetta entrambi
      stops: v.stops || (v.tappe ? v.tappe.length : 0),
      duration: v.duration || "60 min",
      tappe: v.tappe.map((t) => ({
        ordine: t.ordine,
        logistica: t.logistica || t.indicazione_per_raggiungerlo,
        item_default: t.item_default || t.item_deafult || t.item_id_principale, // Protezione per l'errore "deafult"
        varianti_difficolta: t.varianti_difficolta || {},
      })),
    }));

    await Visit.insertMany(visitsToInsert);
    debug.push(`🗺️ Inserite ${visitsToInsert.length} visite`);

    await mongoose.connection.close();
    return {
      success: true,
      message: "<h1>Successo!</h1><p>DB Gocker popolato correttamente.</p>",
      debug: debug,
    };
  } catch (e) {
    console.error(e);
    return { success: false, error: e.message, debug: debug };
  }
};
