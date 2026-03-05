const mongoose = require("mongoose");

const tappaSchema = new mongoose.Schema(
  {
    ordine: Number,
    logistica: String,
    item_default: {
      type: String, // OBBLIGATORIO: String se i tuoi ID sono "it_ramesse_..."
      ref: "Item", // Deve corrispondere al nome del modello in Item.js
    },
    varianti_difficolta: {
      infantile: String,
      medio: String,
      avanzato: String,
    },
  },
  { _id: false },
);

const visitaSchema = new mongoose.Schema(
  {
    titolo: { type: String }, // Opzionale se usi 'title'
    title: { type: String }, // Aggiunto per matchare "title" del JSON
    museo: { type: String },
    image: { type: String },
    type: { type: String },
    duration: { type: String },
    stops: { type: Number },
    livello_base: { type: String }, // Match con "livello_base"
    info_generale: { type: String }, // Match con "info_generale"
    tappe: [tappaSchema],
  },
  { timestamps: true, strict: false, strictPopulate: false },
);

module.exports = mongoose.model("Visita", visitaSchema, "visits");
