const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");

// Modelli in inglese per coerenza con il database unico
const User = require("../models/user");
const Item = require("../models/item");
const Visit = require("../models/visit");

const SEED_FILE = path.join(__dirname, "../public/data/seed_data.json");

// Funzione di utilità per generare l'URI di connessione
const getMongoUri = (credentials) => {
  return credentials && credentials.site
    ? `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${credentials.user}?authSource=admin&writeConcern=majority`
    : "mongodb://localhost:27017/ArtAround";
};

/**
 * Inizializza il DB con i dati obbligatori (Seeding)
 */
exports.create = async function (credentials) {
  let debug = [];
  try {
    const mongouri = getMongoUri(credentials);
    await mongoose.connect(mongouri);
    debug.push("✅ Connected for seeding.");

    const rawData = await fs.readFile(SEED_FILE, "utf-8");
    const seedData = JSON.parse(rawData);

    // Pulizia collezioni
    await Promise.all([
      User.deleteMany({}),
      Item.deleteMany({}),
      Visit.deleteMany({}),
    ]);

    // Creazione Utenti
    const createdUsers = await User.create(seedData.users);
    const authors = createdUsers.filter((u) => u.role === "autore");

    // Creazione Items (Opere)
    const itemsToInsert = seedData.items.map((item, index) => ({
      ...item,
      creatorId: authors[index % authors.length]._id,
    }));
    const createdItems = await Item.insertMany(itemsToInsert);

    // Creazione Visite predefinite
    for (const vData of seedData.visits) {
      const visitItems = vData.items.map((it, idx) => ({
        itemId: createdItems[idx % createdItems.length]._id,
        order: it.order,
        navigationInstruction: it.navigationInstruction,
      }));

      await Visit.create({
        ...vData,
        creatorId: authors[0]._id,
        items: visitItems,
      });
    }

    await mongoose.connection.close();
    return { message: "<h1>Database Seeding Complete!</h1>", debug: debug };
  } catch (err) {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    return { message: "❌ Seeding Error: " + err.message };
  }
};

/**
 * Funzione di ricerca unificata per Navigator e Marketplace
 */
exports.search = async function (q, credentials) {
  try {
    await mongoose.connect(getMongoUri(credentials));

    let results;
    // 1. Ricerca specifica per ID (Usata dalla Preview del Navigator)
    if (q.visitId) {
      results = await Visit.findById(q.visitId).populate("items.itemId");
    }
    // 2. Richiesta di tutte le visite (Usata dalla Home del Navigator)
    else if (q.type === "visits") {
      results = await Visit.find(q.museum ? { museum: q.museum } : {});
    }
    // 3. Ricerca opere (Usata dal Marketplace/Editor)
    else {
      let filter = {};
      if (q.museum) filter.museum = q.museum;
      if (q.language) filter.language = q.language;
      results = await Item.find(filter);
    }

    await mongoose.connection.close();
    return results;
  } catch (err) {
    return { error: err.message };
  }
};

/**
 * Funzione per salvare una nuova visita (Usata dall'Editor del Marketplace)
 */
exports.saveVisit = async function (visitData, credentials) {
  try {
    await mongoose.connect(getMongoUri(credentials));

    // Creiamo la visita ricevuta dal Marketplace
    const newVisit = new Visit(visitData);
    const saved = await newVisit.save();

    await mongoose.connection.close();
    return saved;
  } catch (err) {
    return { error: err.message };
  }
};

module.exports = {
  create: exports.create,
  search: exports.search,
  saveVisit: exports.saveVisit, // Assicurati che questa riga ci sia
};
