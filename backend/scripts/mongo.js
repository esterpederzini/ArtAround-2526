const mongoose = require("mongoose");
const fs = require("fs").promises;
const path = require("path");

// Carichiamo i modelli che abbiamo appena scritto in inglese
const User = require("../models/user");
const Item = require("../models/item");
const Visit = require("../models/visit");

// Il percorso del file JSON con i dati di test (deve essere in public/data/)
const SEED_FILE = path.join(__dirname, "../public/data/seed_data.json");

/**
 * Funzione invocata dal server quando si richiede l'inizializzazione del DB.
 * Gestisce la connessione dinamica per i Docker del dipartimento.
 */
exports.create = async function (credentials) {
  let debug = [];
  try {
    // Costruzione dell'URI di connessione secondo le specifiche del dipartimento [cite: 619, 620, 659]
    // Se credentials.site non esiste, prova a connettersi in locale per lo sviluppo
    const mongouri =
      credentials && credentials.site
        ? `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${credentials.user}?authSource=admin&writeConcern=majority`
        : "mongodb://localhost:27017/ArtAround";

    debug.push(`Connecting to: ${credentials?.site || "localhost"}...`);

    // Connessione tramite Mongoose [cite: 628, 647]
    await mongoose.connect(mongouri);
    debug.push("✅ MongoDB connected successfully.");

    // Lettura del file di seed [cite: 234, 424]
    const rawData = await fs.readFile(SEED_FILE, "utf-8");
    const seedData = JSON.parse(rawData);
    debug.push("📖 Seed data loaded from JSON.");

    // 1. Pulizia totale (Tabula Rasa) per evitare duplicati [cite: 715]
    await Promise.all([
      User.deleteMany({}),
      Item.deleteMany({}),
      Visit.deleteMany({}),
    ]);
    debug.push("🗑️ Existing collections cleared.");

    // 2. Creazione Utenti (autore1, autore2, visitatore1, visitatore2) [cite: 427, 428]
    // L'hash delle password è gestito dal middleware nel modello User.js
    const createdUsers = await User.create(seedData.users);
    debug.push(`👤 Created ${createdUsers.length} mandatory users.`);

    // 3. Creazione Items (Opere con metadati di lingua e durata) [cite: 266, 275]
    const authors = createdUsers.filter((u) => u.role === "autore");
    const itemsToInsert = seedData.items.map((item, index) => ({
      ...item,
      creatorId: authors[index % authors.length]._id,
      isPublished: true,
    }));
    const createdItems = await Item.insertMany(itemsToInsert);
    debug.push(`🖼️ Created ${createdItems.length} items (Artworks).`);

    // 4. Creazione Visite (Sequenze con indicazioni logistiche separate) [cite: 264, 429]
    for (const vData of seedData.visits) {
      const visitItems = vData.items.map((it, idx) => ({
        itemId: createdItems[idx % createdItems.length]._id,
        order: it.order,
        navigationInstruction:
          it.navigationInstruction || "Follow the path to the next room.",
        isOptional: it.isOptional || false,
      }));

      await Visit.create({
        ...vData,
        creatorId: authors[0]._id,
        items: visitItems,
        isPublic: true,
      });
    }
    debug.push(`🗺️ Created ${seedData.visits.length} museum visits.`);

    await mongoose.connection.close();
    debug.push("🔌 Connection closed.");

    return {
      message: `<h1>Success! Added ${createdItems.length} items and ${seedData.visits.length} visits.</h1>`,
      debug: debug,
    };
  } catch (err) {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    return { message: "❌ Error: " + err.message, debug: debug };
  }
};

/**
 * Funzione per cercare contenuti. Verrà chiamata dalle rotte API del tuo server.
 */
exports.search = async function (q, credentials) {
  const mongouri =
    credentials && credentials.site
      ? `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${credentials.user}?authSource=admin&writeConcern=majority`
      : "mongodb://localhost:27017/ArtAround";

  try {
    await mongoose.connect(mongouri);

    let results;
    if (q.visitId) {
      // Se cerchiamo una visita, "riempiamo" i dati degli item collegati
      results = await Visit.findById(q.visitId).populate("items.itemId");
    } else {
      // Ricerca normale per gli item
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
