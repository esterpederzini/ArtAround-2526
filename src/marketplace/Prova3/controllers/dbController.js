/**
 * dbController.js
 * Script di seeding per popolare il database MongoDB
 * Legge i dati da public/data/seed_data.json
 * Eseguire con: npm run seed
 */

require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Item = require('../models/Item');
const Visita = require('../models/Visita');

const SEED_FILE = path.join(__dirname, '../public/data/seed_data.json');

async function leggiSeedData() {
  try {
    const rawData = await fs.readFile(SEED_FILE, 'utf-8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Impossibile leggere seed_data.json:', err.message);
    process.exit(1);
  }
}

async function svuotaCollezioni() {
  console.log('🗑️  Svuotamento collezioni esistenti...');
  await Promise.all([
    User.deleteMany({}),
    Item.deleteMany({}),
    Visita.deleteMany({})
  ]);
  console.log('✅ Collezioni svuotate.');
}

async function seedUtenti(utentiData) {
  console.log('👤 Creazione utenti...');
  const utenti = [];

  for (const u of utentiData) {
    const hashedPwd = await bcrypt.hash(u.password, 12);
    const user = await User.create({
      username: u.username,
      email: u.email,
      password: hashedPwd,
      ruolo: u.ruolo,
      museo: u.museo || null
    });
    utenti.push(user);
    console.log(`   ✅ Utente creato: ${user.username} (${user.ruolo})`);
  }

  return utenti;
}

async function seedItems(itemsData, utenti) {
  console.log('🖼️  Creazione items...');
  const autori = utenti.filter(u => u.ruolo === 'autore');
  const itemsCreati = [];

  for (let i = 0; i < itemsData.length; i++) {
    const d = itemsData[i];
    const autore = autori[i % autori.length];

    const item = await Item.create({
      ...d,
      creatorId: autore._id,
      pubblicato: true
    });
    itemsCreati.push(item);
  }

  console.log(`   ✅ ${itemsCreati.length} items creati.`);
  return itemsCreati;
}

async function seedVisite(visiteData, utenti, items) {
  console.log('🗺️  Creazione visite...');
  const autori = utenti.filter(u => u.ruolo === 'autore');

  for (let v = 0; v < visiteData.length; v++) {
    const dv = visiteData[v];
    const autore = autori[v % autori.length];

    // Seleziona items per questa visita (10 per visita, con offset)
    const offset = v * 10;
    const itemsPerVisita = items.slice(offset, offset + 10);
    if (itemsPerVisita.length < 10) {
      itemsPerVisita.push(...items.slice(0, 10 - itemsPerVisita.length));
    }

    const itemsInVisita = itemsPerVisita.map((item, idx) => ({
      itemId: item._id,
      ordine: idx + 1,
      opzionale: idx >= 7, // ultimi 3 opzionali
      notePersonali: ''
    }));

    const visita = await Visita.create({
      titolo: dv.titolo,
      descrizione: dv.descrizione,
      museo: dv.museo,
      creatorId: autore._id,
      items: itemsInVisita,
      pubblica: true,
      prezzo: dv.prezzo || 0,
      licenza: { tipo: dv.licenza || 'gratuito' },
      tags: dv.tags || [],
      durataTotaleStimata: dv.durataTotaleStimata || 60
    });

    console.log(`   ✅ Visita creata: "${visita.titolo}"`);
  }
}

async function runSeed() {
  try {
    console.log('\n🌱 Avvio seeding ArtAround...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connesso.\n');

    const seedData = await leggiSeedData();

    await svuotaCollezioni();
    console.log('');

    const utenti = await seedUtenti(seedData.utenti);
    console.log('');

    const items = await seedItems(seedData.items, utenti);
    console.log('');

    await seedVisite(seedData.visite, utenti, items);
    console.log('');

    console.log('🎉 Seeding completato con successo!\n');
  } catch (err) {
    console.error('❌ Errore durante il seeding:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnesso.');
    process.exit(0);
  }
}

runSeed();