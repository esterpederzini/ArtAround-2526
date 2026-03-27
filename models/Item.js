const mongoose = require("mongoose");

const logVenditaSchema = new mongoose.Schema({
  acquirenteId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  dataAcquisto: { type: Date, default: Date.now },
  prezzo: Number,
  tipo: { type: String, enum: ["acquisto", "adozione"], default: "acquisto" },
});

const itemSchema = new mongoose.Schema(
  {
    // AGGIUNTO: Permette di usare stringhe personalizzate come "it_ramesse_01"
    _id: { type: String },
    operaId: { type: String, required: true, trim: true, index: true },
    museo: { type: String, required: true, trim: true, index: true },
    titolo: { type: String, required: true, trim: true },
    descrizione: { type: String, required: true },
    audioUrl: { type: String, default: "" },
    autore: { type: String, required: true, trim: true },

    // AGGIUNTO/MODIFICATO: Allineato al campo 'url' che hai su Atlas
    url: { type: String, default: null },
    immagine: { type: String, default: null }, // Manteniamo immagine per compatibilità

    lunghezza: {
      type: String,
      // Allineato ai tuoi dati: "3s", "15s", "40s"
      enum: ["3s", "15s", "30s", "40s", "1m", "3m", "5m", "10m"],
      required: true,
    },
    linguaggio: {
      type: String,
      // Allineato ai tuoi dati: "infantile", "medio", "avanzato"
      enum: [
        "infantile",
        "medio",
        "avanzato",
        "elementare",
        "intermedio",
        "specialistico",
      ],
      required: true,
    },
    categoria: { type: String, default: "altro" },
    tags: [String],
    licenza: {
      tipo: { type: String, default: "gratuito" },
      note: String,
    },
    prezzo: { type: Number, default: 0 },
    pubblicato: { type: Boolean, default: true },

    // Se su Atlas non hai messo creatorId a mano, rendilo NON obbligatorio
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    profonditaContenuto: { type: String, default: "standard" },
  },
  { timestamps: true, strict: false }, // strict: false è vitale per i dati inseriti a mano
);

itemSchema.index({ museo: 1, pubblicato: 1 });
itemSchema.index({ operaId: 1, linguaggio: 1 });

// Specifichiamo "items" come nome della collezione
module.exports = mongoose.model("Item", itemSchema, "items");
