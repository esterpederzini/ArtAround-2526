/*
File: scripts/mongo.js
Descrizione: Popolamento DB per Gocker usando i modelli esistenti
*/

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // AGGIUNTO: necessario per hashare le password prima di insertMany
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

// --- 1. IMPORTA I MODELLI ESISTENTI ---
// Assicurati che i percorsi siano corretti rispetto alla posizione di mongo.js
const Item = require("../models/Item"); // o come si chiama il file dell'Item
const Visit = require("../models/Visita"); // o Visita.js
const User = require("../models/User");

let dbname = "artaround";

const getUri = (credentials) => {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  return `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
};

// --- 2. FUNZIONE CREATE ---
exports.create = async (credentials) => {
  let debug = [];
  try {
    const mongouri = getUri(credentials);

    // Connessione: se mongoose è già connesso (stato 1), non fare nulla
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongouri);
    }
    debug.push("✅ Connesso al DB");

    // Usiamo process.cwd() per trovare il file nella root del progetto Docker
    let seedPath = path.join(process.cwd(), "seed_data.json");
    debug.push(`Lettura file: ${seedPath}`);

    let doc = await fs.readFile(seedPath, "utf8");
    let fullData = JSON.parse(doc);

    // PULIZIA TOTALE (Svuota le collezioni prima di ricaricare)
    await Item.deleteMany({});
    await Visit.deleteMany({});
    await User.deleteMany({});
    debug.push("🗑️ Database ripulito");

    // 1. INSERIMENTO UTENTI
    // IMPORTANTE: insertMany() bypassa il pre-save hook di Mongoose che hashava le password.
    // Dobbiamo quindi hashare manualmente le password prima di inserirle nel DB,
    // altrimenti verrebbero salvate in chiaro e il login con bcrypt fallirebbe.
    if (fullData.utenti) {
      const utentiConPasswordHashata = await Promise.all(
        fullData.utenti.map(async (utente) => {
          // Hasha la password solo se non è già un hash bcrypt (non inizia con "$2")
          const passwordHashata = utente.password && !utente.password.startsWith("$2")
            ? await bcrypt.hash(utente.password, 12)
            : utente.password;
          return { ...utente, password: passwordHashata };
        })
      );
      await User.insertMany(utentiConPasswordHashata);
      debug.push(`👤 Inseriti ${fullData.utenti.length} utenti (password hashate con bcrypt)`);
    }

    // 2. INSERIMENTO ITEMS
    if (fullData.items) {
      await Item.insertMany(fullData.items);
      debug.push(`🖼️ Inseriti ${fullData.items.length} items`);
    }

    // 3. INSERIMENTO VISITE
    if (fullData.visits) {
      let visitsToInsert = fullData.visits.map((v) => ({
        id: v.id,
        title: v.title || v.titolo,
        image: v.image || v.immagine,
        museo: v.museo,
        livello_base: v.livello_base || v.difficolta_target,
        info_generale: v.info_generale || v.descrizione_logistica,
        stops: v.stops || (v.tappe ? v.tappe.length : 0),
        duration: v.duration || "60 min",
        tappe: (v.tappe || []).map((t) => ({
          ordine: t.ordine,
          logistica: t.logistica || t.indicazione_per_raggiungerlo,
          item_default:
            t.item_default || t.item_deafult || t.item_id_principale,
          varianti_difficolta: t.varianti_difficolta || {},
        })),
      }));

      await Visit.insertMany(visitsToInsert);
      debug.push(`🗺️ Inserite ${visitsToInsert.length} visite`);
    }

    return {
      success: true,
      message:
        "<h1>Successo!</h1><p>DB Gocker popolato correttamente usando i modelli originali.</p>",
      debug: debug,
    };
  } catch (e) {
    console.error("Errore in create:", e);
    return { success: false, error: e.message, debug: debug };
  }
};
