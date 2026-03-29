/**
 * scripts/fix_autore1.js
 *
 * Script una-tantum per correggere la password di autore1 in MongoDB Atlas.
 * autore1 aveva già un hash bcrypt ma NON corrispondeva alla password "12345678"
 * (probabilmente era stato hashato con una password diversa in un run precedente).
 *
 * Questo script forza il re-hash della password "12345678" per autore1.
 *
 * Uso: node scripts/fix_autore1.js
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");

// URI MongoDB: usa MONGO_URL da .env oppure l'URI Atlas hardcoded come in index.js
const MONGO_URI =
  process.env.MONGO_URL ||
  "mongodb+srv://dbArtAround2526:MIeXFqS2A9P8npk5@cluster0.xsxp2c3.mongodb.net/test?retryWrites=true&w=majority";

async function fixAutore1() {
  console.log("🔌 Connessione al database...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connesso al database");

  // Trova autore1
  const autore1 = await User.findOne({ username: "autore1" });
  if (!autore1) {
    console.error("❌ autore1 non trovato nel database");
    await mongoose.disconnect();
    return;
  }

  console.log(`\n📋 autore1 trovato: ${autore1._id}`);
  console.log(`   Hash attuale: ${autore1.password}`);

  // Verifica se l'hash attuale corrisponde a "12345678"
  const matchCorrente = await bcrypt.compare("12345678", autore1.password);
  console.log(`   Hash corrisponde a "12345678": ${matchCorrente}`);

  if (matchCorrente) {
    console.log("✅ La password di autore1 è già corretta, nessuna azione necessaria.");
  } else {
    // Forza il re-hash della password "12345678"
    const nuovoHash = await bcrypt.hash("12345678", 12);
    // Aggiorniamo direttamente nel DB senza passare per il pre-save hook
    await User.updateOne(
      { _id: autore1._id },
      { $set: { password: nuovoHash } }
    );
    console.log(`\n🔐 Password di autore1 aggiornata con nuovo hash: ${nuovoHash}`);

    // Verifica
    const verifica = await bcrypt.compare("12345678", nuovoHash);
    console.log(`   Verifica: ${verifica ? "✅ OK" : "❌ FALLITA"}`);
  }

  await mongoose.disconnect();
  console.log("\n🔌 Disconnesso dal database");
}

fixAutore1().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});
