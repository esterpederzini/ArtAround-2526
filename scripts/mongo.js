/*
File: scripts/mongo.js
Descrizione: Popolamento DB per Gocker usando i modelli esistenti
*/

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();

const Item = require("../models/Item");
const Visit = require("../models/Visita");
const User = require("../models/User");

let dbname = "site252620";

const getUri = (credentials) => {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  return `mongodb://${credentials.user}:${credentials.pwd}@${credentials.site}/${dbname}?authSource=admin&writeConcern=majority`;
};

exports.create = async (credentials) => {
  let debug = [];
  try {
    const mongouri = getUri(credentials);

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongouri);
    }
    debug.push("✅ Connesso al DB");

    let seedPath = path.join(__dirname, "..", "seed_data.json");
    debug.push(`Lettura file: ${seedPath}`);

    let doc = await fs.readFile(seedPath, "utf8");
    let fullData = JSON.parse(doc);

    await Item.deleteMany({});
    await Visit.deleteMany({});
    await User.deleteMany({});
    debug.push("🗑️ Database ripulito");

    if (fullData.utenti) {
      const utentiConPasswordHashata = await Promise.all(
        fullData.utenti.map(async (utente) => {
          const passwordHashata =
            utente.password && !utente.password.startsWith("$2")
              ? await bcrypt.hash(utente.password, 12)
              : utente.password;
          return { ...utente, password: passwordHashata };
        }),
      );
      await User.insertMany(utentiConPasswordHashata);
      debug.push(
        `👤 Inseriti ${fullData.utenti.length} utenti (password hashate con bcrypt)`,
      );
    }

    if (fullData.items) {
      await Item.insertMany(fullData.items);
      debug.push(`🖼️ Inseriti ${fullData.items.length} items`);
    }

    if (fullData.visits) {
      // 🌟 TRASFORMIAMO IL .map IN UN Promise.all ASINCRONO
      let visitsToInsert = await Promise.all(
        fullData.visits.map(async (v) => {
          // Per ogni tappa del JSON, cerchiamo l'ID dell'item corrispondente già inserito nel DB
          const tappeArricchite = await Promise.all(
            (v.tappe || []).map(async (t) => {
              // Cerchiamo l'item nel database usando il codice opera e il linguaggio della visita
              const itemTrovato = await Item.findOne({
                operaId: t.operaId,
                linguaggio: v.livello_base || "medio",
              }).lean();

              return {
                ordine: t.ordine,
                logistica: t.logistica || t.indicazione_per_raggiungerlo,
                operaId: t.operaId, // Ci assicuriamo che salvi anche il codice piatto
                // 🌟 ECCO IL TRUCCO: Se trova l'item nel DB ci mette il suo _id, altrimenti lascia quello che c'era
                item_default: itemTrovato
                  ? itemTrovato._id
                  : t.item_default || t.item_deafult || t.item_id_principale,
                varianti_difficolta: t.varianti_difficolta || {},
              };
            }),
          );

          // Restituiamo l'oggetto della visita con le tappe arricchite degli ID reali
          return {
            id: v.id,
            title: v.title || v.titolo,
            image: v.image || v.immagine,
            museo: v.museo,
            pubblica: v.pubblica ?? false,
            livello_base: v.livello_base || v.difficolta_target,
            info_generale: v.info_generale || v.descrizione_logistica,
            stops: v.stops || tappeArricchite.length,
            duration: v.duration || "60 min",
            tappe: tappeArricchite, // 👈 Assegniamo l'array con i veri ID di MongoDB!
          };
        }),
      );

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
