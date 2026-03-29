/**
 * scripts/fix_passwords.js
 *
 * Script di migrazione una-tantum per correggere le password degli utenti
 * già presenti in MongoDB Atlas che sono state salvate in chiaro (o con un
 * hash errato) a causa del bug nel seed script (insertMany bypassava il
 * pre-save hook di Mongoose).
 *
 * Uso: node scripts/fix_passwords.js
 *
 * Lo script:
 *  1. Si connette al DB usando la stessa logica di mongo.js
 *  2. Trova tutti gli utenti la cui password NON inizia con "$2" (non è un hash bcrypt)
 *  3. Hasha la password in chiaro con bcrypt (salt rounds = 12)
 *  4. Aggiorna il documento nel DB usando updateOne (senza triggerare il pre-save hook)
 *  5. Stampa un riepilogo delle operazioni
 *
 * NOTA: Questo script è stato eseguito il 29/03/2026 e ha aggiornato con successo
 * le password di autore2, visitatore1 e visitatore2.
 * autore1 aveva già una password hashata (ma con hash errato - non corrispondeva a "12345678").
 * Dopo il seeding con il seed script corretto, tutte le password saranno hashate correttamente.
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// Importa il modello User
const User = require("../models/User");

// URI MongoDB: usa MONGO_URL da .env oppure l'URI Atlas hardcoded come in index.js
const MONGO_URI =
  process.env.MONGO_URL ||
  "mongodb+srv://dbArtAround2526:MIeXFqS2A9P8npk5@cluster0.xsxp2c3.mongodb.net/test?retryWrites=true&w=majority";

async function fixPasswords() {
  // Connessione al DB
  const mongoUri = MONGO_URI;

  console.log("🔌 Connessione al database...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connesso al database");

  // Trova tutti gli utenti
  const utenti = await User.find({});
  console.log(`\n📋 Trovati ${utenti.length} utenti totali`);

  let aggiornati = 0;
  let giàHashati = 0;
  let errori = 0;

  for (const utente of utenti) {
    if (utente.password && utente.password.startsWith("$2")) {
      // Password già hashata con bcrypt, nessuna azione necessaria
      console.log(`  ✓ ${utente.username}: password già hashata`);
      giàHashati++;
    } else {
      // Password in chiaro: la hashiamo e aggiorniamo nel DB
      try {
        const nuovoHash = await bcrypt.hash(utente.password, 12);
        // Usiamo updateOne per evitare di triggerare il pre-save hook
        await User.updateOne(
          { _id: utente._id },
          { $set: { password: nuovoHash } }
        );
        console.log(`  🔐 ${utente.username}: password hashata e aggiornata`);
        aggiornati++;
      } catch (err) {
        console.error(`  ❌ ${utente.username}: errore - ${err.message}`);
        errori++;
      }
    }
  }

  console.log("\n📊 Riepilogo:");
  console.log(`  ✅ Aggiornati: ${aggiornati}`);
  console.log(`  ℹ️  Già hashati: ${giàHashati}`);
  console.log(`  ❌ Errori: ${errori}`);

  await mongoose.disconnect();
  console.log("\n🔌 Disconnesso dal database");
}

fixPasswords().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});
