/*
File: scripts/mongo.js
Progetto: ArtAround
Descrizione: Gestione Database MongoDB per Gocker
*/

const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");

// Configurazione nomi
let fn = "seed_data.json";
let dbname = "artaround";

// --- 1. DEFINIZIONE DELLO SCHEMA ---
// Questo schema è quello che il Navigator si aspetta di ricevere
const visitSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false },
  image: { type: String, required: false },
  type: { type: String, required: false },
  duration: { type: String, required: false },
  stops: { type: Number, required: false },
});

const Visit = mongoose.model("Visit", visitSchema);
mongoose.set("strictQuery", false);

// --- 2. FUNZIONE CREATE (Popola il DB dal JSON) ---
exports.create = async (credentials) => {
  let debug = [];
  try {
    const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;

    await mongoose.connect(mongouri);
    debug.push(`Connesso a MongoDB su ${credentials.site}...`);

    let seedPath = path.join(__dirname, "..", "seed_data.json");
    debug.push(`Lettura file: ${seedPath}`);

    let doc = await fs.readFile(seedPath, "utf8");
    let fullData = JSON.parse(doc);

    // --- LOGICA DI MAPPATURA ---
    // Prendiamo la lista "visite" dal tuo JSON e la adattiamo allo Schema
    let dataToInsert = fullData.visite.map((v) => ({
      title: v.titolo,
      description: v.descrizione,
      image:
        v.immagine ||
        "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=2070", // Default Egizio se manca
      type: "AUDIO GUIDE",
      duration: v.durataTotaleStimata
        ? v.durataTotaleStimata + " min"
        : "60 min",
      stops: v.tags ? v.tags.length : 0,
    }));

    debug.push(`Dati processati: trovate ${dataToInsert.length} visite.`);

    // Svuota la collezione e inserisce i nuovi dati
    await Visit.deleteMany({});
    debug.push(`Database pulito.`);

    let inserted = await Visit.insertMany(dataToInsert);
    debug.push(`Inseriti ${inserted.length} nuovi record.`);

    await mongoose.connection.close();
    return {
      message: `<h1>Successo!</h1><p>Database popolato con ${inserted.length} visite.</p>`,
      debug: debug,
    };
  } catch (e) {
    console.error(e);
    return { error: e.message, debug: debug };
  }
};

// --- 3. FUNZIONE SEARCH (Per il tuo Navigator) ---
exports.search = async (q, credentials) => {
  const mongouri = `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;

  try {
    await mongoose.connect(mongouri);

    let query = {};
    if (q && q.title) {
      query.title = { $regex: new RegExp(q.title, "i") };
    }

    const results = await Visit.find(query);
    await mongoose.connection.close();

    // Restituiamo i risultati pronti per il Navigator
    return results;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
};
