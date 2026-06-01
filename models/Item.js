const mongoose = require("mongoose");

const logVenditaSchema = new mongoose.Schema({
  acquirenteId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  dataAcquisto: { type: Date, default: Date.now },
  prezzo: Number,
  tipo: { type: String, enum: ["acquisto", "adozione"], default: "acquisto" },
});

const itemSchema = new mongoose.Schema(
  {
    operaId: { type: String, required: true, trim: true, index: true },
    museo: { type: String, required: true, trim: true, index: true },
    titolo: { type: String, required: true, trim: true },
    descrizione: { type: String, required: true },
    audioUrl: { type: String, default: "" },
    autore_visita: { type: String, required: true },
    piano: {
      type: String,
      default: "0",
      enum: ["-1", "0", "1", "2"], // Coerente con il tuo config.json
    },
    mappa_x: {
      type: Number,
      default: 0,
    },
    mappa_y: {
      type: Number,
      default: 0,
    },

    stile: {
      type: String,
      required: false,
      trim: true,
      default: "Periodo storico non specificato",
    },
    artista: { type: String, default: "Ignoto" },
    periodo: { type: String },
    url: { type: String, default: null },
    immagine: { type: String, default: null },
    lunghezza: {
      type: String,
      enum: ["3s", "15s", "30s", "40s", "1m", "3m", "5m", "10m"],
      required: true,
    },
    linguaggio: {
      type: String,
      enum: ["infantile", "medio", "avanzato", "elementare", "intermedio"],
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
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    profonditaContenuto: { type: String, default: "standard" },
  },
  { timestamps: true, strict: false },
);

itemSchema.index({ museo: 1, pubblicato: 1 });
itemSchema.index({ operaId: 1, linguaggio: 1 });

// Specifichiamo "items" come nome della collezione
module.exports = mongoose.model("Item", itemSchema, "items");
