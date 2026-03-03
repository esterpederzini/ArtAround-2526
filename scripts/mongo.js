/*
File: scripts/mongo.js
Progetto: ArtAround
Descrizione: Gestione Database MongoDB (Atlas o Gocker)
*/

const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config(); // Carica il file .env

let dbname = "artaround";

// --- 1. DEFINIZIONE DELLO SCHEMA ---
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

// --- FUNZIONE DI SUPPORTO PER L'URI ---
const getUri = (credentials) => {
  if (process.env.MONGO_URL) {
    console.log("🛠️ Usando database ATLAS");
    return process.env.MONGO_URL;
  }
  console.log("🌐 Usando database GOCKER");
  return `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
};

// --- 2. FUNZIONE CREATE ---
exports.create = async (credentials) => {
  let debug = [];
  try {
    const mongouri = getUri(credentials);
    await mongoose.connect(mongouri);

    let seedPath = path.join(__dirname, "..", "seed_data.json");
    let doc = await fs.readFile(seedPath, "utf8");
    let fullData = JSON.parse(doc);

    let dataToInsert = fullData.visite.map((v) => ({
      title: v.titolo,
      description: v.descrizione,
      image:
        v.immagine ||
        "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?q=80&w=2070",
      type: "AUDIO GUIDE",
      duration: v.durataTotaleStimata
        ? v.durataTotaleStimata + " min"
        : "60 min",
      stops: v.tags ? v.tags.length : 0,
    }));

    await Visit.deleteMany({});
    let inserted = await Visit.insertMany(dataToInsert);
    await mongoose.connection.close();

    return {
      message: `<h1>Successo!</h1><p>Database popolato con ${inserted.length} visite.</p>`,
      debug: debug,
    };
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
};

// --- 3. FUNZIONE SEARCH ---
exports.search = async (q, credentials) => {
  try {
    const mongouri = getUri(credentials);
    await mongoose.connect(mongouri);

    let query = {};
    if (q && q.title) {
      query.title = { $regex: new RegExp(q.title, "i") };
    }

    const results = await Visit.find(query);
    await mongoose.connection.close();
    return results;
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }
};
